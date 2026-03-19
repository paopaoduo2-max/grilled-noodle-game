import { Color, Label, Node, tween, UITransform, Vec3, UIOpacity } from 'cc';

export class BBQFloatingText {
    private parent: Node;

    constructor(parent: Node) {
        this.parent = parent;
    }

    public show(text: string, color: Color = new Color(255, 255, 255, 255)): void {
        const node = new Node('BBQFloatingText');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(400, 40);
        const opacity = node.addComponent(UIOpacity);
        opacity.opacity = 255;

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = 20;
        label.lineHeight = 22;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        node.setPosition(0, 260, 0);
        this.parent.addChild(node);

        tween(node)
            .to(0.3, { position: new Vec3(0, 300, 0) })
            .delay(1.1)
            .call(() => { opacity.opacity = 0; })
            .delay(0.05)
            .call(() => node.destroy())
            .start();
    }
}
