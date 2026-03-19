import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Vec3, tween } from 'cc';
import { ActiveEffect } from './RandomEventSystemV2';

const { ccclass, property } = _decorator;

/**
 * 🎯 右上角状态图标UI
 * 显示当前活跃的效果图标，鼠标悬停显示详情
 */
@ccclass('StatusIconUI')
export class StatusIconUI extends Component {
    private containerNode: Node = null;
    private effectNodes: Map<string, Node> = new Map();
    private tooltipNode: Node = null;
    private tooltipLabel: Label = null;

    /**
     * 创建状态图标容器
     */
    public createUI(parent: Node, position: Vec3) {
        // 主容器
        this.containerNode = new Node('StatusIconContainer');
        parent.addChild(this.containerNode);
        this.containerNode.setPosition(position);

        const transform = this.containerNode.addComponent(UITransform);
        transform.setContentSize(200, 40);
        transform.anchorX = 1;
        transform.anchorY = 0.5;

        // 创建提示框
        this.createTooltip();

        console.log('[StatusIconUI] 状态图标容器已创建');
    }

    /**
     * 创建提示框（已禁用，使用统一的EffectNotification）
     */
    private createTooltip() {
        // 不再创建独立的tooltip，避免重复显示
        // 效果详情改为在点击图标时显示
    }

    /**
     * 添加效果图标
     */
    public addEffect(effect: ActiveEffect) {
        if (this.effectNodes.has(effect.id)) return;

        const iconNode = new Node('Effect_' + effect.id);
        this.containerNode.addChild(iconNode);

        const transform = iconNode.addComponent(UITransform);
        transform.setContentSize(36, 36);

        // 背景
        const bg = iconNode.addComponent(Graphics);
        const borderColor = this.getEffectBorderColor(effect.type);
        bg.fillColor = new Color(40, 40, 55, 220);
        bg.roundRect(-18, -18, 36, 36, 6);
        bg.fill();
        bg.strokeColor = borderColor;
        bg.lineWidth = 2;
        bg.roundRect(-18, -18, 36, 36, 6);
        bg.stroke();

        // 图标
        const iconLabel = new Node('Icon');
        iconNode.addChild(iconLabel);
        const label = iconLabel.addComponent(Label);
        label.string = effect.icon;
        label.fontSize = 20;

        // 天数标签
        const daysNode = new Node('Days');
        iconNode.addChild(daysNode);
        daysNode.setPosition(12, -12, 0);
        const daysLabel = daysNode.addComponent(Label);
        daysLabel.string = effect.remainingDays > 0 ? `${effect.remainingDays}` : '';
        daysLabel.fontSize = 10;
        daysLabel.color = new Color(255, 255, 255, 255);
        daysLabel.node.name = 'DaysLabel';

        // 存储引用
        this.effectNodes.set(effect.id, iconNode);

        // 重新排列
        this.repositionIcons();

        // 入场动画
        iconNode.setScale(0, 0, 1);
        tween(iconNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        // 悬停事件已禁用（改为使用统一的EffectNotification）

        console.log(`[StatusIconUI] 添加效果图标: ${effect.name}`);
    }

    /**
     * 移除效果图标
     */
    public removeEffect(effectId: string) {
        const node = this.effectNodes.get(effectId);
        if (!node) return;

        // 退场动画
        tween(node)
            .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                node.destroy();
                this.effectNodes.delete(effectId);
                this.repositionIcons();
            })
            .start();

        console.log(`[StatusIconUI] 移除效果图标: ${effectId}`);
    }

    /**
     * 更新效果剩余天数
     */
    public updateEffectDays(effectId: string, remainingDays: number) {
        const node = this.effectNodes.get(effectId);
        if (!node) return;

        const daysLabel = node.getChildByName('Days')?.getComponent(Label);
        if (daysLabel) {
            daysLabel.string = remainingDays > 0 ? `${remainingDays}` : '';
        }
    }

    /**
     * 获取效果边框颜色
     */
    private getEffectBorderColor(type: 'buff' | 'debuff' | 'pending'): Color {
        switch (type) {
            case 'buff': return new Color(100, 255, 100, 255);
            case 'debuff': return new Color(255, 100, 100, 255);
            case 'pending': return new Color(255, 200, 100, 255);
            default: return new Color(150, 150, 150, 255);
        }
    }

    /**
     * 重新排列图标位置
     */
    private repositionIcons() {
        let x = 0;
        this.effectNodes.forEach((node) => {
            node.setPosition(x, 0, 0);
            x -= 44; // 图标宽度36 + 间距8
        });
    }

    /**
     * 显示提示框
     */
    private showTooltip(effect: ActiveEffect, iconNode: Node) {
        if (!this.tooltipNode || !this.tooltipLabel) return;

        // 设置内容
        let content = `${effect.name}\n`;
        content += `来源: ${effect.sourceEvent}\n`;
        content += `剩余: ${effect.remainingDays}天`;
        
        if (effect.customerRate) {
            const percent = Math.round((effect.customerRate - 1) * 100);
            content += `\n客流: ${percent > 0 ? '+' : ''}${percent}%`;
        }
        if (effect.pendingMoney) {
            content += `\n待结算: ${effect.pendingMoney > 0 ? '+' : ''}${effect.pendingMoney}金币`;
        }

        this.tooltipLabel.string = content;

        // 定位提示框
        this.tooltipNode.setPosition(iconNode.position.x, -30, 0);
        this.tooltipNode.active = true;

        // 淡入动画
        this.tooltipNode.setScale(0.9, 0.9, 1);
        tween(this.tooltipNode)
            .to(0.15, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 隐藏提示框
     */
    private hideTooltip() {
        if (!this.tooltipNode) return;
        this.tooltipNode.active = false;
    }

    /**
     * 清空所有图标
     */
    public clearAll() {
        this.effectNodes.forEach((node) => {
            node.destroy();
        });
        this.effectNodes.clear();
    }

    /**
     * 获取当前效果数量
     */
    public getEffectCount(): number {
        return this.effectNodes.size;
    }
}
