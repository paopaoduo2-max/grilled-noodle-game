/**
 * PhoneUIComponents.ts
 * 手机UI组件工厂
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, UITransform, Graphics, Color, Vec3, tween, Button } from 'cc';

/**
 * 手机UI组件工厂类
 * 提供各种iOS风格的UI组件创建方法
 */
export class PhoneUIComponents {
    
    /**
     * 📱 创建手机网格按钮（精致玻璃风格）
     */
    static createPhoneGridCard(icon: string, title: string, subtitle: string, x: number, y: number, callback?: () => void): Node {
        const card = new Node(`${title}Card`);
        card.setPosition(x, y, 0);
        
        const cardWidth = 160;
        const cardHeight = 85;
        
        const transform = card.addComponent(UITransform);
        transform.setContentSize(cardWidth, cardHeight);
        
        // 背景节点（Graphics组件放在子节点上）
        const bgNode = new Node('Background');
        card.addChild(bgNode);
        const bg = bgNode.addComponent(Graphics);
        
        // 多层阴影效果
        bg.fillColor = new Color(0, 0, 0, 6);
        bg.roundRect(-cardWidth/2 + 4, -cardHeight/2 - 4, cardWidth, cardHeight, 16);
        bg.fill();
        bg.fillColor = new Color(0, 0, 0, 10);
        bg.roundRect(-cardWidth/2 + 2, -cardHeight/2 - 2, cardWidth, cardHeight, 15);
        bg.fill();
        
        // 白色卡片背景
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.fill();
        
        // 边框
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.stroke();
        
        // 图标
        const iconNode = new Node('Icon');
        card.addChild(iconNode);
        iconNode.setPosition(0, 18, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 28;
        
        // 标题（深色文字）
        const titleNode = new Node('Title');
        card.addChild(titleNode);
        titleNode.setPosition(0, -12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(30, 41, 59, 255);
        titleLabel.isBold = true;
        
        // 副标题
        const subtitleNode = new Node('Subtitle');
        card.addChild(subtitleNode);
        subtitleNode.setPosition(0, -30, 0);
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = subtitle;
        subtitleLabel.fontSize = 11;
        subtitleLabel.color = new Color(100, 116, 139, 255);
        
        // 点击事件（精致按压效果）
        if (callback) {
            PhoneUIComponents.addPressEffect(card, bgNode, cardWidth, cardHeight, callback);
        }
        
        return card;
    }
    
    /**
     * 添加按压效果
     */
    private static addPressEffect(card: Node, bgNode: Node, cardWidth: number, cardHeight: number, callback: () => void) {
        // 添加Button组件以接收触摸事件
        card.addComponent(Button);
        
        const bg = bgNode.getComponent(Graphics);
        if (!bg) return;
        
        card.on(Node.EventType.TOUCH_START, () => {
            tween(card).to(0.08, { scale: new Vec3(0.96, 0.96, 1) }).start();
            bg.clear();
            bg.fillColor = new Color(241, 245, 249, 255);
            bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
            bg.fill();
            bg.strokeColor = new Color(203, 213, 225, 255);
            bg.lineWidth = 1;
            bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
            bg.stroke();
        });
        card.on(Node.EventType.TOUCH_END, () => {
            tween(card).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            PhoneUIComponents.restoreCardBackground(bgNode, cardWidth, cardHeight);
            callback();
        });
        card.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(card).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            PhoneUIComponents.restoreCardBackground(bgNode, cardWidth, cardHeight);
        });
    }
    
    /**
     * 恢复卡片背景
     */
    private static restoreCardBackground(bgNode: Node, cardWidth: number, cardHeight: number) {
        const bg = bgNode.getComponent(Graphics);
        if (!bg) return;
        bg.clear();
        bg.fillColor = new Color(0, 0, 0, 12);
        bg.roundRect(-cardWidth/2 + 2, -cardHeight/2 - 2, cardWidth, cardHeight, 14);
        bg.fill();
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.fill();
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.stroke();
    }
    
    /**
     * 📊 创建状态显示（带色块头部）
     */
    static createStatusDisplay(icon: string, title: string, value: string, x: number, y: number): Node {
        const display = new Node('StatusDisplay');
        display.setPosition(x, y, 0);
        
        const transform = display.addComponent(UITransform);
        transform.setContentSize(160, 70);
        
        // 背景节点
        const bgNode = new Node('Background');
        display.addChild(bgNode);
        const bg = bgNode.addComponent(Graphics);
        
        // 阴影
        bg.fillColor = new Color(0, 0, 0, 10);
        bg.roundRect(-78, -37, 160, 70, 12);
        bg.fill();
        
        // 白色背景
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-80, -35, 160, 70, 12);
        bg.fill();
        
        // 边框
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-80, -35, 160, 70, 12);
        bg.stroke();
        
        // 图标
        const iconNode = new Node('Icon');
        display.addChild(iconNode);
        iconNode.setPosition(-50, 0, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 24;
        
        // 标题
        const titleNode = new Node('Title');
        display.addChild(titleNode);
        titleNode.setPosition(20, 12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 12;
        titleLabel.color = new Color(100, 116, 139, 255);
        
        // 数值
        const valueNode = new Node('Value');
        display.addChild(valueNode);
        valueNode.setPosition(20, -12, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = value;
        valueLabel.fontSize = 16;
        valueLabel.color = new Color(30, 41, 59, 255);
        valueLabel.isBold = true;
        
        return display;
    }
    
    /**
     * 创建iOS风格卡片（1.5倍放大）
     */
    static createModernCard(icon: string, title: string, subtitle: string, x: number, y: number, callback?: () => void): Node {
        const card = new Node(`${title}Card`);
        const scale = 1.5;
        const cardWidth = 170 * scale;
        const cardHeight = 55 * scale;
        
        // 卡片背景
        const bg = new Node('Background');
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.strokeColor = new Color(220, 220, 220, 255);
        bgGraphics.lineWidth = 1;
        bgGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12 * scale);
        bgGraphics.fill();
        bgGraphics.stroke();
        card.addChild(bg);
        
        // 左侧图标容器
        const iconBg = new Node('IconBg');
        const iconBgGraphics = iconBg.addComponent(Graphics);
        iconBgGraphics.fillColor = new Color(0, 122, 255, 255);
        iconBgGraphics.circle(0, 0, 18 * scale);
        iconBgGraphics.fill();
        iconBg.setPosition(-cardWidth / 2 + 30 * scale, 0, 0);
        card.addChild(iconBg);
        
        // 图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 18 * scale;
        iconBg.addChild(iconNode);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 14 * scale;
        titleLabel.color = new Color(50, 50, 50, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(20 * scale, 8 * scale, 0);
        card.addChild(titleNode);
        
        // 副标题
        const subtitleNode = new Node('Subtitle');
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = subtitle;
        subtitleLabel.fontSize = 11 * scale;
        subtitleLabel.color = new Color(120, 120, 120, 255);
        subtitleNode.setPosition(20 * scale, -10 * scale, 0);
        card.addChild(subtitleNode);
        
        // 右侧箭头
        const arrowNode = new Node('Arrow');
        const arrowLabel = arrowNode.addComponent(Label);
        arrowLabel.string = '›';
        arrowLabel.fontSize = 24 * scale;
        arrowLabel.color = new Color(180, 180, 180, 255);
        arrowNode.setPosition(cardWidth / 2 - 20 * scale, 0, 0);
        card.addChild(arrowNode);
        
        // UITransform
        const cardTransform = card.addComponent(UITransform);
        cardTransform.setContentSize(cardWidth, cardHeight);
        
        card.setPosition(x, y, 0);
        
        // 点击事件
        if (callback) {
            card.addComponent(Button);  // 需要Button组件接收触摸事件
            card.on(Node.EventType.TOUCH_START, () => {
                tween(card).to(0.1, { scale: new Vec3(0.98, 0.98, 1) }).start();
            });
            card.on(Node.EventType.TOUCH_END, () => {
                tween(card).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
                callback();
            });
            card.on(Node.EventType.TOUCH_CANCEL, () => {
                tween(card).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
            });
        }
        
        return card;
    }
    
    /**
     * 创建手机按钮
     */
    static createPhoneButton(text: string, x: number, y: number, callback: () => void): Node {
        const button = new Node('PhoneButton');
        
        // 按钮背景
        const bg = new Node('Background');
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(0, 122, 255, 255);
        bgGraphics.roundRect(-60, -20, 120, 40, 8);
        bgGraphics.fill();
        button.addChild(bg);
        
        // 按钮文字
        const label = new Node('Label');
        const labelComp = label.addComponent(Label);
        labelComp.string = text;
        labelComp.fontSize = 16;
        labelComp.color = new Color(255, 255, 255, 255);
        button.addChild(label);
        
        // UITransform
        const transform = button.addComponent(UITransform);
        transform.setContentSize(120, 40);
        
        button.setPosition(x, y, 0);
        
        // 点击事件
        button.addComponent(Button);  // 需要Button组件接收触摸事件
        button.on(Node.EventType.TOUCH_START, () => {
            tween(button).to(0.08, { scale: new Vec3(0.95, 0.95, 1) }).start();
        });
        button.on(Node.EventType.TOUCH_END, () => {
            tween(button).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            callback();
        });
        button.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(button).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
        });
        
        return button;
    }
    
    /**
     * 创建设置区块标题
     */
    static createSettingsSection(title: string, x: number, y: number): Node {
        const section = new Node(`${title}Section`);
        
        const label = section.addComponent(Label);
        label.string = title;
        label.fontSize = 13;
        label.color = new Color(134, 142, 150, 255);
        
        section.setPosition(x, y, 0);
        return section;
    }
    
    /**
     * 创建设置项
     */
    static createSettingsItem(title: string, value: string, x: number, y: number): Node {
        const item = new Node(`${title}Item`);
        const itemWidth = 320;
        const itemHeight = 44;
        
        // 添加UITransform
        const itemTransform = item.addComponent(UITransform);
        itemTransform.setContentSize(itemWidth, itemHeight);
        
        // 背景节点
        const bgNode = new Node('Background');
        item.addChild(bgNode);
        const bg = bgNode.addComponent(Graphics);
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-itemWidth/2, -itemHeight/2, itemWidth, itemHeight, 10);
        bg.fill();
        
        // 边框
        bg.strokeColor = new Color(229, 231, 235, 255);
        bg.lineWidth = 1;
        bg.roundRect(-itemWidth/2, -itemHeight/2, itemWidth, itemHeight, 10);
        bg.stroke();
        
        // 标题
        const titleNode = new Node('Title');
        item.addChild(titleNode);
        titleNode.setPosition(-itemWidth/2 + 16, 0, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(31, 41, 55, 255);
        titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        
        // 值
        const valueNode = new Node('Value');
        item.addChild(valueNode);
        valueNode.setPosition(itemWidth/2 - 40, 0, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = value;
        valueLabel.fontSize = 16;
        valueLabel.color = new Color(107, 114, 128, 255);
        valueLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        
        // 箭头
        const arrowNode = new Node('Arrow');
        item.addChild(arrowNode);
        arrowNode.setPosition(itemWidth/2 - 16, 0, 0);
        const arrowLabel = arrowNode.addComponent(Label);
        arrowLabel.string = '›';
        arrowLabel.fontSize = 20;
        arrowLabel.color = new Color(156, 163, 175, 255);
        
        item.setPosition(x, y, 0);
        return item;
    }
    
    /**
     * 创建重新开始选项卡片
     */
    static createRestartOptionCard(icon: string, title: string, subtitle: string, accentColor: Color, x: number, y: number): Node {
        const card = new Node('RestartCard');
        card.setPosition(x, y, 0);
        
        const cardWidth = 150;
        const cardHeight = 100;
        
        const cardTransform = card.addComponent(UITransform);
        cardTransform.setContentSize(cardWidth, cardHeight);
        
        // 背景节点
        const bgNode = new Node('Background');
        card.addChild(bgNode);
        const bg = bgNode.addComponent(Graphics);
        
        // 卡片背景
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 12);
        bg.fill();
        
        // 顶部色条
        bg.fillColor = accentColor;
        bg.roundRect(-cardWidth/2, cardHeight/2 - 8, cardWidth, 8, 0);
        bg.fill();
        
        // 边框
        bg.strokeColor = new Color(229, 231, 235, 255);
        bg.lineWidth = 1;
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 12);
        bg.stroke();
        
        // 图标
        const iconNode = new Node('Icon');
        card.addChild(iconNode);
        iconNode.setPosition(0, 15, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 28;
        
        // 标题
        const titleNode = new Node('Title');
        card.addChild(titleNode);
        titleNode.setPosition(0, -15, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(31, 41, 55, 255);
        titleLabel.isBold = true;
        
        // 副标题
        const subtitleNode = new Node('Subtitle');
        card.addChild(subtitleNode);
        subtitleNode.setPosition(0, -35, 0);
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = subtitle;
        subtitleLabel.fontSize = 11;
        subtitleLabel.color = new Color(107, 114, 128, 255);
        
        return card;
    }
}
