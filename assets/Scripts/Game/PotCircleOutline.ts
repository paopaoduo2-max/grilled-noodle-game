import { _decorator, Component, Graphics, UITransform, Color } from 'cc';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('PotCircleOutline')
@executeInEditMode
export class PotCircleOutline extends Component {
    @property
    lineWidth = 4;

    @property({ tooltip: 'Outline color' })
    lineColor = new Color(255, 200, 90, 255);

    private graphics: Graphics | null = null;
    private transform: UITransform | null = null;
    private lastWidth = 0;
    private lastHeight = 0;

    onLoad(): void {
        this.graphics = this.getComponent(Graphics);
        this.transform = this.getComponent(UITransform);
    }

    onEnable(): void {
        this.syncSizeWithParent();
        this.redraw();
    }

    private syncSizeWithParent(): void {
        if (!this.transform) return;
        const parentTransform = this.node.parent?.getComponent(UITransform);
        if (parentTransform) {
            this.transform.setContentSize(parentTransform.contentSize);
        }
    }

    update(): void {
        if (!this.transform || !this.graphics) return;
        this.syncSizeWithParent();
        const size = this.transform.contentSize;
        if (size.width !== this.lastWidth || size.height !== this.lastHeight) {
            this.redraw();
        }
    }

    private redraw(): void {
        if (!this.graphics || !this.transform) return;
        const size = this.transform.contentSize;
        const radius = Math.min(size.width, size.height) / 2;
        this.graphics.clear();
        this.graphics.lineWidth = this.lineWidth;
        this.graphics.strokeColor = this.lineColor;
        this.graphics.circle(0, 0, radius);
        this.graphics.stroke();
        this.lastWidth = size.width;
        this.lastHeight = size.height;
    }
}
