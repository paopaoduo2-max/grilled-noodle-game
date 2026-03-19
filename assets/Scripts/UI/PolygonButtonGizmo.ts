import { _decorator, Component, Node, Vec2, Vec3, Graphics, Color, UITransform, Camera } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 多边形按钮的可视化编辑辅助组件
 * 在场景编辑器中显示多边形边框和可拖拽的顶点控制点
 */
@ccclass('PolygonButtonGizmo')
@executeInEditMode
export class PolygonButtonGizmo extends Component {

    @property({
        tooltip: '边框颜色'
    })
    lineColor: Color = new Color(0, 255, 0, 200);

    @property({
        tooltip: '顶点颜色'
    })
    vertexColor: Color = new Color(255, 100, 0, 255);

    @property({
        tooltip: '边框线宽'
    })
    lineWidth: number = 3;

    @property({
        tooltip: '顶点大小'
    })
    vertexSize: number = 12;

    @property({
        tooltip: '是否显示Gizmo'
    })
    showGizmo: boolean = true;

    private _graphics: Graphics | null = null;

    onLoad() {
        this.setupGraphics();
    }

    onEnable() {
        this.setupGraphics();
        this.drawPolygon();
    }

    update() {
        if (this.showGizmo) {
            this.drawPolygon();
        } else if (this._graphics) {
            this._graphics.clear();
        }
    }

    private setupGraphics() {
        // 查找或创建Graphics子节点
        let gizmoNode = this.node.getChildByName('_PolygonGizmo');
        if (!gizmoNode) {
            gizmoNode = new Node('_PolygonGizmo');
            gizmoNode.layer = this.node.layer;
            this.node.addChild(gizmoNode);
            
            // 添加UITransform
            const transform = gizmoNode.addComponent(UITransform);
            transform.setContentSize(2000, 2000);
        }

        this._graphics = gizmoNode.getComponent(Graphics);
        if (!this._graphics) {
            this._graphics = gizmoNode.addComponent(Graphics);
        }
    }

    private drawPolygon() {
        if (!this._graphics) return;

        // 获取PolygonButton组件
        const polygonButton = this.node.getComponent('PolygonButton') as any;
        if (!polygonButton) return;

        // 优先使用getVerticesForGizmo，否则使用getScaledVertices
        const vertices = polygonButton.getVerticesForGizmo 
            ? polygonButton.getVerticesForGizmo() 
            : (polygonButton.getScaledVertices ? polygonButton.getScaledVertices() : []);
        if (vertices.length < 3) {
            this._graphics.clear();
            return;
        }

        this._graphics.clear();

        // 绘制多边形边框
        this._graphics.strokeColor = this.lineColor;
        this._graphics.lineWidth = this.lineWidth;
        this._graphics.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            this._graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        this._graphics.close();
        this._graphics.stroke();

        // 绘制填充区域（半透明）
        this._graphics.fillColor = new Color(
            this.lineColor.r, 
            this.lineColor.g, 
            this.lineColor.b, 
            50
        );
        this._graphics.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            this._graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        this._graphics.close();
        this._graphics.fill();

        // 绘制顶点控制点
        this._graphics.fillColor = this.vertexColor;
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            this._graphics.circle(v.x, v.y, this.vertexSize / 2);
            this._graphics.fill();

            // 绘制顶点编号
            // 注意：Graphics不支持文字，需要在编辑器中查看顶点索引
        }
    }

    onDisable() {
        if (this._graphics) {
            this._graphics.clear();
        }
    }

    onDestroy() {
        const gizmoNode = this.node.getChildByName('_PolygonGizmo');
        if (gizmoNode) {
            gizmoNode.destroy();
        }
    }
}
