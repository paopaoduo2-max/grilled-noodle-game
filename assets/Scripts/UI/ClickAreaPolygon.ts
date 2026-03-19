import { _decorator, Component, Node, Vec2, Vec3, UITransform, EventTouch, Graphics, Color, Button } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 四边形点击区域组件
 * 使用 4 个子节点定义点击区域的四个角
 * 
 * 使用方法：
 * 1. 将此组件添加到 ClickArea 节点
 * 2. 点击"创建控制点"按钮自动创建 4 个角点
 * 3. 在场景中拖动 P1~P4 调整点击区域形状
 */
@ccclass('ClickAreaPolygon')
@executeInEditMode
export class ClickAreaPolygon extends Component {
    
    @property({
        displayName: "显示调试轮廓",
        tooltip: "显示点击区域边框"
    })
    showDebug: boolean = false;
    
    @property({
        displayName: "调试颜色"
    })
    debugColor: Color = new Color(0, 255, 0, 100);
    
    @property({
        displayName: "创建控制点",
        tooltip: "点击创建 4 个角点"
    })
    get createPoints(): boolean { return false; }
    set createPoints(v: boolean) {
        if (v) this.createControlPoints();
    }
    
    private _uiTransform: UITransform | null = null;
    private _debugGraphics: Graphics | null = null;
    
    onLoad() {
        this._uiTransform = this.node.getComponent(UITransform);
        // 运行时强制隐藏调试显示
        this.showDebug = false;
    }
    
    start() {
        // 隐藏已有的调试图形
        this.hideDebugGraphics();
    }
    
    /**
     * 隐藏调试图形
     */
    private hideDebugGraphics() {
        const debugNode = this.node.getChildByName('_DebugPolygon');
        if (debugNode) {
            debugNode.active = false;
        }
        if (this._debugGraphics) {
            this._debugGraphics.clear();
        }
    }
    
    update() {
        if (!this._uiTransform) {
            this._uiTransform = this.node.getComponent(UITransform);
        }
        // 运行时不绘制调试图形
        // if (this.showDebug) {
        //     this.updateDebugDraw();
        // }
    }
    
    /**
     * 创建 4 个控制点
     */
    private createControlPoints() {
        const size = this._uiTransform?.contentSize || { width: 400, height: 300 };
        const hw = size.width / 2;
        const hh = size.height / 2;
        
        const positions = [
            { name: 'P1', x: -hw, y: -hh },  // 左下
            { name: 'P2', x: hw, y: -hh },   // 右下
            { name: 'P3', x: hw, y: hh },    // 右上
            { name: 'P4', x: -hw, y: hh },   // 左上
        ];
        
        for (const pos of positions) {
            let point = this.node.getChildByName(pos.name);
            if (!point) {
                point = new Node(pos.name);
                point.parent = this.node;
                point.addComponent(UITransform).setContentSize(20, 20);
            }
            point.setPosition(pos.x, pos.y, 0);
        }
        
        console.log('[ClickAreaPolygon] ✅ 已创建 4 个控制点 (P1~P4)');
    }
    
    /**
     * 获取四边形顶点（本地坐标）
     */
    private getPolygonPoints(): Vec2[] {
        const points: Vec2[] = [];
        const names = ['P1', 'P2', 'P3', 'P4'];
        
        for (const name of names) {
            const node = this.node.getChildByName(name);
            if (node) {
                points.push(new Vec2(node.position.x, node.position.y));
            }
        }
        
        // 如果没有控制点，使用 UITransform 的边界
        if (points.length < 4 && this._uiTransform) {
            const size = this._uiTransform.contentSize;
            const hw = size.width / 2;
            const hh = size.height / 2;
            return [
                new Vec2(-hw, -hh),
                new Vec2(hw, -hh),
                new Vec2(hw, hh),
                new Vec2(-hw, hh),
            ];
        }
        
        return points;
    }
    
    /**
     * 更新调试绘制
     */
    private updateDebugDraw() {
        const polygon = this.getPolygonPoints();
        if (polygon.length < 3) return;
        
        // 获取或创建 Graphics
        if (!this._debugGraphics) {
            let debugNode = this.node.getChildByName('_DebugPolygon');
            if (!debugNode) {
                debugNode = new Node('_DebugPolygon');
                debugNode.parent = this.node;
                debugNode.addComponent(UITransform).setContentSize(0, 0);
            }
            this._debugGraphics = debugNode.getComponent(Graphics) || debugNode.addComponent(Graphics);
        }
        
        const g = this._debugGraphics;
        g.clear();
        
        if (!this.showDebug) return;
        
        // 绘制填充
        g.fillColor = this.debugColor;
        g.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
            g.lineTo(polygon[i].x, polygon[i].y);
        }
        g.close();
        g.fill();
        
        // 绘制边框
        g.strokeColor = new Color(0, 255, 0, 255);
        g.lineWidth = 3;
        g.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
            g.lineTo(polygon[i].x, polygon[i].y);
        }
        g.close();
        g.stroke();
        
        // 绘制顶点标记
        g.fillColor = new Color(255, 0, 0, 255);
        for (const p of polygon) {
            g.circle(p.x, p.y, 8);
            g.fill();
        }
    }
    
    /**
     * 兼容旧接口
     */
    public containsTouch(event: any): boolean {
        return true;
    }
}
