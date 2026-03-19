import { _decorator, Component, Node, Vec2, UITransform, Graphics, Color, view } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 可视化点击区域编辑器
 * 可以在编辑器中拖动四个角来定义点击范围
 */
@ccclass('ClickAreaEditor')
@executeInEditMode
export class ClickAreaEditor extends Component {

    @property({
        type: Node,
        tooltip: '左上角控制点（拖动此节点调整位置）'
    })
    topLeftNode: Node | null = null;

    @property({
        type: Node,
        tooltip: '右上角控制点（拖动此节点调整位置）'
    })
    topRightNode: Node | null = null;

    @property({
        type: Node,
        tooltip: '右下角控制点（拖动此节点调整位置）'
    })
    bottomRightNode: Node | null = null;

    @property({
        type: Node,
        tooltip: '左下角控制点（拖动此节点调整位置）'
    })
    bottomLeftNode: Node | null = null;

    @property({
        tooltip: '启用点击区域限制'
    })
    enableAreaLimit: boolean = true;

    @property({
        tooltip: '在编辑器中显示点击区域边框'
    })
    showAreaBorder: boolean = true;

    @property({
        tooltip: '边框颜色'
    })
    borderColor: Color = new Color(0, 255, 0, 200);

    @property({
        tooltip: '边框线宽'
    })
    borderWidth: number = 3;

    private _uiTransform: UITransform | null = null;
    private _graphics: Graphics | null = null;
    private _gizmoNode: Node | null = null;

    onLoad() {
        this._uiTransform = this.getComponent(UITransform);

        // 重写 UITransform 的点击检测
        if (this._uiTransform && this.enableAreaLimit) {
            const originalHitTest = this._uiTransform.hitTest.bind(this._uiTransform);
            const self = this;
            this._uiTransform.hitTest = function(screenPoint: Vec2, windowId?: number): boolean {
                // 先用原始方法检测是否在节点范围内
                const inNode = originalHitTest(screenPoint, windowId);
                if (!inNode) return false;
                
                // 再检测是否在我们的区域内
                return self.isPointInClickArea(screenPoint);
            };
        }

        this.setupGizmo();
    }

    onEnable() {
        this.setupGizmo();
        this.updateGizmo();
    }

    onDestroy() {
        if (this._gizmoNode) {
            this._gizmoNode.destroy();
        }
    }

    update() {
        // 在编辑器中实时更新边框
        if (this.showAreaBorder) {
            this.updateGizmo();
        } else if (this._graphics) {
            this._graphics.clear();
        }
    }

    /**
     * 设置Gizmo显示
     */
    private setupGizmo() {
        if (!this._gizmoNode) {
            this._gizmoNode = this.node.getChildByName('_ClickAreaGizmo');
        }
        
        if (!this._gizmoNode) {
            this._gizmoNode = new Node('_ClickAreaGizmo');
            this._gizmoNode.layer = this.node.layer;
            this.node.addChild(this._gizmoNode);
            
            const transform = this._gizmoNode.addComponent(UITransform);
            transform.setContentSize(2000, 2000);
        }

        this._graphics = this._gizmoNode.getComponent(Graphics);
        if (!this._graphics) {
            this._graphics = this._gizmoNode.addComponent(Graphics);
        }
    }

    /**
     * 获取四个角的本地坐标
     */
    private getCornerPositions(): {tl: Vec2, tr: Vec2, br: Vec2, bl: Vec2} | null {
        if (!this.topLeftNode || !this.topRightNode || !this.bottomRightNode || !this.bottomLeftNode) {
            return null;
        }
        return {
            tl: new Vec2(this.topLeftNode.position.x, this.topLeftNode.position.y),
            tr: new Vec2(this.topRightNode.position.x, this.topRightNode.position.y),
            br: new Vec2(this.bottomRightNode.position.x, this.bottomRightNode.position.y),
            bl: new Vec2(this.bottomLeftNode.position.x, this.bottomLeftNode.position.y)
        };
    }

    /**
     * 更新Gizmo显示
     */
    private updateGizmo() {
        if (!this._graphics || !this.showAreaBorder) return;

        this._graphics.clear();

        const corners = this.getCornerPositions();
        if (!corners) return;

        // 绘制四边形边框
        this._graphics.strokeColor = this.borderColor;
        this._graphics.lineWidth = this.borderWidth;
        
        // 按顺序连接四个角：左上 -> 右上 -> 右下 -> 左下
        this._graphics.moveTo(corners.tl.x, corners.tl.y);
        this._graphics.lineTo(corners.tr.x, corners.tr.y);
        this._graphics.lineTo(corners.br.x, corners.br.y);
        this._graphics.lineTo(corners.bl.x, corners.bl.y);
        this._graphics.close();
        this._graphics.stroke();

        // 绘制填充（半透明）
        this._graphics.fillColor = new Color(
            this.borderColor.r,
            this.borderColor.g,
            this.borderColor.b,
            30
        );
        this._graphics.moveTo(corners.tl.x, corners.tl.y);
        this._graphics.lineTo(corners.tr.x, corners.tr.y);
        this._graphics.lineTo(corners.br.x, corners.br.y);
        this._graphics.lineTo(corners.bl.x, corners.bl.y);
        this._graphics.close();
        this._graphics.fill();

        // 绘制中心点
        const centerX = (corners.tl.x + corners.tr.x + corners.br.x + corners.bl.x) / 4;
        const centerY = (corners.tl.y + corners.tr.y + corners.br.y + corners.bl.y) / 4;
        this._graphics.fillColor = new Color(255, 255, 0, 255);
        this._graphics.circle(centerX, centerY, 5);
        this._graphics.fill();
    }

    /**
     * 射线法判断点是否在多边形内
     */
    private isPointInPolygon(x: number, y: number, polygon: {x: number, y: number}[]): boolean {
        const n = polygon.length;
        let inside = false;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * 检测屏幕点是否在点击区域内（用于hitTest重写）
     * screenPoint 是屏幕坐标（左下角为原点）
     */
    public isPointInClickArea(screenPoint: Vec2): boolean {
        if (!this.topLeftNode || !this.topRightNode || !this.bottomRightNode || !this.bottomLeftNode) {
            return true; // 没有控制点，允许点击
        }

        // 获取可见区域和设计分辨率
        const visibleSize = view.getVisibleSize();
        const designSize = view.getDesignResolutionSize();
        
        // 计算缩放比例
        const scaleX = designSize.width / visibleSize.width;
        const scaleY = designSize.height / visibleSize.height;
        
        // 将屏幕坐标转换为设计分辨率坐标（以中心为原点）
        const touchX = screenPoint.x * scaleX - designSize.width / 2;
        const touchY = screenPoint.y * scaleY - designSize.height / 2;
        
        // 获取四个控制点的世界坐标
        const polygon = [
            { x: this.topLeftNode.worldPosition.x, y: this.topLeftNode.worldPosition.y },
            { x: this.topRightNode.worldPosition.x, y: this.topRightNode.worldPosition.y },
            { x: this.bottomRightNode.worldPosition.x, y: this.bottomRightNode.worldPosition.y },
            { x: this.bottomLeftNode.worldPosition.x, y: this.bottomLeftNode.worldPosition.y }
        ];

        const result = this.isPointInPolygon(touchX, touchY, polygon);
        
        console.log(`[ClickAreaEditor] ${this.node.name} 屏幕:(${screenPoint.x.toFixed(0)},${screenPoint.y.toFixed(0)}) 设计:(${touchX.toFixed(0)},${touchY.toFixed(0)}) TL:(${polygon[0].x.toFixed(0)},${polygon[0].y.toFixed(0)}) BR:(${polygon[2].x.toFixed(0)},${polygon[2].y.toFixed(0)}) ${result ? '✓' : '✗'}`);
        
        return result;
    }

    /**
     * 创建四个控制点节点
     */
    public createControlNodes() {
        const positions = [
            { name: 'CornerTL', x: -150, y: 150 },
            { name: 'CornerTR', x: 150, y: 150 },
            { name: 'CornerBR', x: 150, y: -150 },
            { name: 'CornerBL', x: -150, y: -150 }
        ];

        const nodes: Node[] = [];
        for (const pos of positions) {
            let node = this.node.getChildByName(pos.name);
            if (!node) {
                node = new Node(pos.name);
                node.setPosition(pos.x, pos.y, 0);
                this.node.addChild(node);
            }
            nodes.push(node);
        }

        this.topLeftNode = nodes[0];
        this.topRightNode = nodes[1];
        this.bottomRightNode = nodes[2];
        this.bottomLeftNode = nodes[3];
    }
}
