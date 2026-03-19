import { Color, Graphics, Label, Node, Sprite, UITransform } from 'cc';
import { IngredientConfig } from '../../Config/IngredientConfig';
import { BBQ_CONFIG } from '../model/BBQConfig';
import { BBQCookState, BBQSlotState } from '../model/BBQTypes';

export class BBQSlotView {
    private node: Node;
    private sprite: Sprite | null;
    private label: Label | null = null;
    private progress: Graphics | null = null;
    private progressNode: Node | null = null;

    constructor(node: Node) {
        this.node = node;
        this.sprite = node.getComponent(Sprite);
        if (this.sprite) {
            this.sprite.enabled = true;
        }
        this.ensureLabel();
        this.ensureProgress();
    }

    public update(slot: BBQSlotState, selected: boolean = false): void {
        if (!this.label) this.ensureLabel();
        if (!this.label) return;

        const stateText = this.getStateText(slot.cookState);
        if (!slot.ingredient) {
            this.label.string = '';
            this.applyColor('empty', selected);
            this.updateProgress(slot);
            return;
        }

        const emoji = IngredientConfig.getDisplayContent(slot.ingredient);
        const sauce = slot.hasSauce ? '🥫' : '';
        const spice = slot.hasSpice ? '🧂' : '';
        this.label.string = `${emoji}${sauce}${spice}\n${stateText}`;
        this.applyColor(slot.cookState, selected);
        this.updateProgress(slot);
    }

    private ensureLabel(): void {
        const existing = this.node.getChildByName('BBQLabel');
        if (existing) {
            this.label = existing.getComponent(Label);
            return;
        }
        const labelNode = new Node('BBQLabel');
        const transform = labelNode.addComponent(UITransform);
        transform.setContentSize(48, 48);
        labelNode.setPosition(0, 0, 0);
        this.label = labelNode.addComponent(Label);
        this.label.fontSize = 14;
        this.label.lineHeight = 16;
        this.label.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.label.verticalAlign = Label.VerticalAlign.CENTER;
        this.node.addChild(labelNode);
    }

    private ensureProgress(): void {
        const existing = this.node.getChildByName('BBQProgress');
        if (existing) {
            this.progressNode = existing;
            this.progress = existing.getComponent(Graphics);
            return;
        }
        const barNode = new Node('BBQProgress');
        const transform = barNode.addComponent(UITransform);
        transform.setContentSize(46, 6);
        barNode.setPosition(0, -20, 0);
        this.progress = barNode.addComponent(Graphics);
        this.progressNode = barNode;
        this.node.addChild(barNode);
    }

    private updateProgress(slot: BBQSlotState): void {
        if (!this.progressNode || !this.progress) this.ensureProgress();
        if (!this.progressNode || !this.progress) return;

        const transform = this.progressNode.getComponent(UITransform);
        const width = transform?.contentSize.width ?? 46;
        const height = transform?.contentSize.height ?? 6;
        const radius = height / 2;

        this.progress.clear();
        this.progress.fillColor = new Color(30, 30, 30, 160);
        this.progress.roundRect(-width / 2, -height / 2, width, height, radius);
        this.progress.fill();

        if (!slot.ingredient) return;

        const total = BBQ_CONFIG.burnDuration;
        const ratio = total > 0 ? slot.cookElapsed / total : 0;
        const fill = Math.max(0, Math.min(1, ratio));
        this.progress.fillColor = this.getProgressColor(slot.cookElapsed, BBQ_CONFIG.cookDuration, BBQ_CONFIG.burnDuration);
        this.progress.roundRect(-width / 2, -height / 2, width * fill, height, radius);
        this.progress.fill();
    }

    private getProgressColor(elapsed: number, cookDuration: number, burnDuration: number): Color {
        if (elapsed < cookDuration * 0.35) {
            return new Color(231, 76, 60, 255);
        }
        if (elapsed < cookDuration) {
            return new Color(241, 196, 15, 255);
        }
        if (elapsed < burnDuration) {
            return new Color(46, 204, 113, 255);
        }
        return new Color(127, 140, 141, 255);
    }

    private applyColor(state: BBQCookState, selected: boolean): void {
        const color = this.getStateColor(state);
        if (this.sprite) {
            this.sprite.color = color;
        }
        if (selected && this.sprite) {
            this.sprite.color = new Color(
                Math.min(255, color.r + 30),
                Math.min(255, color.g + 30),
                Math.min(255, color.b + 30),
                color.a
            );
        }
    }

    private getStateText(state: BBQCookState): string {
        switch (state) {
            case 'raw':
                return '生';
            case 'cooking':
                return '烤';
            case 'cooked':
                return '熟';
            case 'burnt':
                return '焦';
            default:
                return '';
        }
    }

    private getStateColor(state: BBQCookState): Color {
        switch (state) {
            case 'raw':
                return new Color(180, 120, 110, 255);
            case 'cooking':
                return new Color(220, 160, 80, 255);
            case 'cooked':
                return new Color(120, 190, 120, 255);
            case 'burnt':
                return new Color(90, 90, 90, 255);
            default:
                return new Color(70, 70, 70, 180);
        }
    }
}
