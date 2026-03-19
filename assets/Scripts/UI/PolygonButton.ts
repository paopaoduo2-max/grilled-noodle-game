import { _decorator, Component, Node, Vec2, Vec3, EventTouch, UITransform, Button, CCInteger, Enum, view, Camera } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 预设形状枚举
 */
enum PresetShape {
    CUSTOM = 0,      // 自定义
    ELLIPSE = 1,     // 椭圆形
    DIAMOND = 2,     // 菱形
    HEXAGON = 3,     // 六边形
    OCTAGON = 4,     // 八边形
}
Enum(PresetShape);

/**
 * 单个顶点类（可在编辑器中编辑）
 */
@ccclass('PolygonVertex')
class PolygonVertex {
    @property({ tooltip: 'X坐标（相对于节点中心）' })
    x: number = 0;
    
    @property({ tooltip: 'Y坐标（相对于节点中心）' })
    y: number = 0;
}

/**
 * 多边形点击区域按钮
 * 支持不规则多边形点击检测，可在编辑器中配置顶点
 */
@ccclass('PolygonButton')
@executeInEditMode
export class PolygonButton extends Component {
    
    @property({
        type: PresetShape,
        tooltip: '预设形状（选择后自动生成顶点）'
    })
    presetShape: PresetShape = PresetShape.CUSTOM;

    @property({
        tooltip: '预设形状的宽度',
        visible() { return this.presetShape !== PresetShape.CUSTOM; }
    })
    shapeWidth: number = 300;

    @property({
        tooltip: '预设形状的高度',
        visible() { return this.presetShape !== PresetShape.CUSTOM; }
    })
    shapeHeight: number = 300;

    @property({
        type: [PolygonVertex],
        tooltip: '多边形顶点列表（点击+添加顶点，顺时针或逆时针排列）',
        visible() { return this.presetShape === PresetShape.CUSTOM && !this.useNodeVertices; }
    })
    vertexList: PolygonVertex[] = [];

    @property({
        tooltip: '使用子节点作为顶点（可在场景中拖拽调整位置）',
        visible() { return this.presetShape === PresetShape.CUSTOM; }
    })
    useNodeVertices: boolean = false;

    @property({
        type: [Node],
        tooltip: '顶点节点列表（将子节点拖入此列表，在场景中拖拽调整位置）',
        visible() { return this.presetShape === PresetShape.CUSTOM && this.useNodeVertices; }
    })
    vertexNodes: Node[] = [];

    @property({
        tooltip: '启用多边形检测（关闭则使用默认矩形检测）'
    })
    enablePolygonHitTest: boolean = true;

    @property({
        tooltip: '显示调试边框（编辑模式下可见）'
    })
    showDebugBorder: boolean = true;

    private _button: Button | null = null;
    private _uiTransform: UITransform | null = null;

    /**
     * 获取当前有效的顶点列表（不含缩放）
     */
    private getVertices(): Vec2[] {
        if (this.presetShape === PresetShape.CUSTOM) {
            if (this.useNodeVertices && this.vertexNodes.length >= 3) {
                // 从子节点位置获取顶点（节点位置已经是相对于父节点的本地坐标）
                // 不需要额外处理缩放，因为hitTest时会统一处理
                return this.vertexNodes
                    .filter(node => node && node.isValid)
                    .map(node => new Vec2(node.position.x, node.position.y));
            } else {
                // 使用手动输入的顶点列表
                return this.vertexList.map(v => new Vec2(v.x, v.y));
            }
        } else {
            // 根据预设形状生成顶点
            return this.generatePresetVertices();
        }
    }
    
    /**
     * 获取用于Gizmo显示的顶点（已考虑缩放）
     */
    public getVerticesForGizmo(): Vec2[] {
        if (this.presetShape === PresetShape.CUSTOM && this.useNodeVertices && this.vertexNodes.length >= 3) {
            // 使用节点顶点时，直接返回节点位置（不需要再乘以scale，因为节点位置已经是正确的）
            return this.vertexNodes
                .filter(node => node && node.isValid)
                .map(node => new Vec2(node.position.x, node.position.y));
        }
        // 其他情况需要考虑缩放
        return this.getScaledVertices();
    }

    /**
     * 创建顶点控制节点（编辑器辅助功能）
     */
    public createVertexNodes(count: number = 4) {
        // 清除现有顶点节点
        this.vertexNodes.forEach(node => {
            if (node && node.isValid) {
                node.destroy();
            }
        });
        this.vertexNodes = [];

        // 创建新的顶点节点
        const radius = 150;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const vertexNode = new Node(`Vertex_${i}`);
            vertexNode.setPosition(x, y, 0);
            this.node.addChild(vertexNode);
            this.vertexNodes.push(vertexNode);
        }

        this.useNodeVertices = true;
    }

    /**
     * 根据预设形状生成顶点
     */
    private generatePresetVertices(): Vec2[] {
        const hw = this.shapeWidth / 2;
        const hh = this.shapeHeight / 2;
        const vertices: Vec2[] = [];

        switch (this.presetShape) {
            case PresetShape.ELLIPSE:
                // 用12边形近似椭圆
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    vertices.push(new Vec2(
                        Math.cos(angle) * hw,
                        Math.sin(angle) * hh
                    ));
                }
                break;
            case PresetShape.DIAMOND:
                vertices.push(new Vec2(0, -hh));
                vertices.push(new Vec2(hw, 0));
                vertices.push(new Vec2(0, hh));
                vertices.push(new Vec2(-hw, 0));
                break;
            case PresetShape.HEXAGON:
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    vertices.push(new Vec2(
                        Math.cos(angle) * hw,
                        Math.sin(angle) * hh
                    ));
                }
                break;
            case PresetShape.OCTAGON:
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
                    vertices.push(new Vec2(
                        Math.cos(angle) * hw,
                        Math.sin(angle) * hh
                    ));
                }
                break;
        }
        return vertices;
    }

    private _touchBlocked: boolean = false;

    onLoad() {
        this._button = this.getComponent(Button);
        this._uiTransform = this.getComponent(UITransform);
        
        if (this.enablePolygonHitTest) {
            // 注册自定义点击检测 - 需要在捕获阶段拦截
            this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
            this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
            this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this, true);
        }
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this, true);
    }

    /**
     * 触摸开始事件 - 检测是否在多边形内
     */
    private onTouchStart(event: EventTouch) {
        this._touchBlocked = false;
        
        // 确保Button是启用的
        if (this._button && !this._button.interactable) {
            this._button.interactable = true;
        }
        
        const vertices = this.getVertices();
        if (!this.enablePolygonHitTest || vertices.length < 3) {
            console.log('[PolygonButton] 多边形检测未启用或顶点不足，允许点击');
            return; // 使用默认检测
        }

        // 获取触摸位置并进行多边形检测
        const isInPolygon = this.hitTestPolygonByEvent(event);
        
        console.log(`[PolygonButton] ${this.node.name} 点击检测: ${isInPolygon ? '在多边形内 ✅ 允许点击' : '在多边形外 ❌ 阻止事件'}`);

        if (isInPolygon) {
            // 在多边形内，不做任何处理，让事件正常传递
            return;
        }
        
        // 不在多边形内
        this._touchBlocked = true;
        
        // 临时禁用Button组件
        if (this._button) {
            this._button.interactable = false;
        }
        
        // 阻止事件传递
        event.propagationStopped = true;
        event.propagationImmediateStopped = true;
        // 阻止事件被吞噬，让其他节点可以接收
        event.preventSwallow = true;
    }

    /**
     * 触摸结束事件 - 如果触摸被阻止，也阻止结束事件
     */
    private onTouchEnd(event: EventTouch) {
        if (this._touchBlocked) {
            console.log(`[PolygonButton] ${this.node.name} TOUCH_END 被阻止`);
            event.propagationStopped = true;
            event.propagationImmediateStopped = true;
            event.preventSwallow = true;
        }
        
        // 恢复Button组件
        if (this._button && this._touchBlocked) {
            // 延迟恢复，确保当前帧的事件处理完成
            this.scheduleOnce(() => {
                if (this._button) {
                    this._button.interactable = true;
                }
            }, 0);
        }
        
        this._touchBlocked = false;
    }

    /**
     * 触摸取消事件
     */
    private onTouchCancel(event: EventTouch) {
        // 恢复Button组件
        if (this._button && this._touchBlocked) {
            this._button.interactable = true;
        }
        this._touchBlocked = false;
    }

    /**
     * 根据触摸事件进行多边形点击检测
     * 使用世界坐标系进行检测，避免复杂的坐标转换
     */
    private hitTestPolygonByEvent(event: EventTouch): boolean {
        // 必须使用节点顶点模式
        if (!this.useNodeVertices || this.vertexNodes.length < 3) {
            console.log(`[PolygonButton] ${this.node.name} 顶点数量不足，跳过检测`);
            return true; // 不检测，允许点击
        }

        // 获取触摸的UI坐标
        const uiLocation = event.getUILocation();
        
        // 获取设计分辨率（Canvas的设计尺寸）
        const designSize = view.getDesignResolutionSize();
        
        // 将UI坐标转换为世界坐标（以设计分辨率中心为原点）
        // UI坐标原点在左下角，需要转换为以中心为原点
        const touchWorldX = uiLocation.x - designSize.width / 2;
        const touchWorldY = uiLocation.y - designSize.height / 2;
        const touchWorldPos = new Vec2(touchWorldX, touchWorldY);
        
        console.log(`[PolygonButton] ${this.node.name} UI坐标:(${uiLocation.x.toFixed(0)},${uiLocation.y.toFixed(0)}) 设计分辨率:(${designSize.width},${designSize.height})`);
        
        // 获取所有顶点节点的世界坐标
        const worldVertices: Vec2[] = [];
        for (const vertexNode of this.vertexNodes) {
            if (vertexNode && vertexNode.isValid) {
                const worldPos = vertexNode.worldPosition;
                worldVertices.push(new Vec2(worldPos.x, worldPos.y));
            }
        }
        
        if (worldVertices.length < 3) {
            console.log(`[PolygonButton] ${this.node.name} 有效顶点不足`);
            return true;
        }
        
        console.log(`[PolygonButton] ${this.node.name} 触摸世界坐标:(${touchWorldPos.x.toFixed(0)},${touchWorldPos.y.toFixed(0)}) 顶点世界坐标:${worldVertices.map(v => `(${v.x.toFixed(0)},${v.y.toFixed(0)})`).join(',')}`);
        
        // 在世界坐标系中进行多边形检测
        return this.isPointInPolygon(touchWorldPos, worldVertices);
    }

    /**
     * 多边形点击检测（射线法）- 公开方法
     * @param screenPos 屏幕坐标
     * @returns 是否在多边形内
     */
    public hitTestPolygon(screenPos: Vec2): boolean {
        const vertices = this.getVertices();
        if (!this._uiTransform || vertices.length < 3) {
            return false;
        }

        // 将屏幕坐标转换为节点本地坐标
        const worldPos = new Vec3(screenPos.x, screenPos.y, 0);
        const localPos3D = this._uiTransform.convertToNodeSpaceAR(worldPos);
        const localPos = new Vec2(localPos3D.x, localPos3D.y);
        
        // 获取最终顶点
        let finalVertices: Vec2[];
        if (this.useNodeVertices && this.vertexNodes.length >= 3) {
            finalVertices = vertices;
        } else {
            finalVertices = vertices;
        }

        // 使用射线法判断点是否在多边形内
        return this.isPointInPolygon(localPos, finalVertices);
    }

    /**
     * 射线法判断点是否在多边形内
     * @param point 待检测的点
     * @param polygon 多边形顶点数组
     * @returns 是否在多边形内
     */
    private isPointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
        const n = polygon.length;
        let inside = false;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            // 射线法：从点向右发射一条射线，计算与多边形边的交点数
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * 从顶点数组设置多边形（用于代码动态设置）
     */
    public setVertices(vertices: Vec2[]) {
        this.presetShape = PresetShape.CUSTOM;
        this.vertexList = vertices.map(v => {
            const pv = new PolygonVertex();
            pv.x = v.x;
            pv.y = v.y;
            return pv;
        });
    }

    /**
     * 获取当前多边形顶点（考虑缩放后的实际值）
     */
    public getScaledVertices(): Vec2[] {
        const vertices = this.getVertices();
        const scale = this.node.scale;
        return vertices.map(v => new Vec2(v.x * scale.x, v.y * scale.y));
    }
}
