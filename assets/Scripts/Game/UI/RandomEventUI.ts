/**
 * RandomEventUI.ts
 * 随机事件UI系统 - 静态方法版本
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, UITransform, Graphics, Color, Vec3, tween, Button, find } from 'cc';
import { RandomEvent, EventOption } from '../RandomEventSystem';

/**
 * 随机事件UI工具类（静态方法）
 */
export class RandomEventUI {
    
    /**
     * 创建事件弹窗UI
     */
    static createEventPanel(event: RandomEvent, onOptionA: () => void, onOptionB: () => void): Node {
        // 创建面板节点
        const panel = new Node('EventPanel');

        // 半透明背景遮罩
        const mask = new Node('Mask');
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(1920, 1080);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 180);
        maskGraphics.rect(-960, -540, 1920, 1080);
        maskGraphics.fill();
        panel.addChild(mask);

        // 事件卡片背景
        const card = new Node('Card');
        const cardTransform = card.addComponent(UITransform);
        const cardWidth = 500;
        const cardHeight = 400;
        cardTransform.setContentSize(cardWidth, cardHeight);
        const cardGraphics = card.addComponent(Graphics);
        cardGraphics.fillColor = new Color(255, 255, 255, 255);
        cardGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20);
        cardGraphics.fill();
        panel.addChild(card);

        // 事件图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = event.icon;
        iconLabel.fontSize = 60;
        iconNode.setPosition(0, 130, 0);
        card.addChild(iconNode);

        // 事件标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = event.name;
        titleLabel.fontSize = 28;
        titleLabel.color = new Color(33, 33, 33, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(0, 70, 0);
        card.addChild(titleNode);

        // 事件描述
        const descNode = new Node('Description');
        const descTransform = descNode.addComponent(UITransform);
        descTransform.setContentSize(cardWidth - 60, 80);
        const descLabel = descNode.addComponent(Label);
        descLabel.string = event.description;
        descLabel.fontSize = 18;
        descLabel.color = new Color(100, 100, 100, 255);
        descLabel.overflow = Label.Overflow.CLAMP;
        descNode.setPosition(0, 10, 0);
        card.addChild(descNode);

        // 选项A按钮
        const btnA = RandomEventUI.createEventButton(
            event.optionA,
            -120, -100,
            new Color(52, 152, 219, 255),
            onOptionA
        );
        card.addChild(btnA);

        // 选项B按钮
        const btnB = RandomEventUI.createEventButton(
            event.optionB,
            120, -100,
            new Color(231, 76, 60, 255),
            onOptionB
        );
        card.addChild(btnB);

        // 入场动画
        card.setScale(0.5, 0.5, 1);
        tween(card)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
            
        return panel;
    }

    /**
     * 创建事件选项按钮
     */
    static createEventButton(option: EventOption, x: number, y: number, color: Color, callback: () => void): Node {
        const btn = new Node('OptionButton');
        const btnWidth = 200;
        const btnHeight = 80;

        // 按钮背景
        const bg = new Node('Background');
        const bgTransform = bg.addComponent(UITransform);
        bgTransform.setContentSize(btnWidth, btnHeight);
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = color;
        bgGraphics.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        bgGraphics.fill();
        btn.addChild(bg);

        // emoji
        const emojiNode = new Node('Emoji');
        const emojiLabel = emojiNode.addComponent(Label);
        emojiLabel.string = option.emoji;
        emojiLabel.fontSize = 24;
        emojiNode.setPosition(0, 18, 0);
        btn.addChild(emojiNode);

        // 文字
        const textNode = new Node('Text');
        const textLabel = textNode.addComponent(Label);
        textLabel.string = option.text;
        textLabel.fontSize = 16;
        textLabel.color = new Color(255, 255, 255, 255);
        textLabel.isBold = true;
        textNode.setPosition(0, -8, 0);
        btn.addChild(textNode);

        // 成本/收益提示
        const costNode = new Node('Cost');
        const costLabel = costNode.addComponent(Label);
        let costText = '';
        if (option.cost !== 0) {
            costText = option.cost > 0 ? `+${option.cost}💰` : `${option.cost}💰`;
        }
        if (option.heatChange !== 0) {
            const heatStr = option.heatChange > 0 ? `+${option.heatChange}🔥` : `${option.heatChange}🔥`;
            costText += (costText ? ' ' : '') + heatStr;
        }
        costLabel.string = costText;
        costLabel.fontSize = 12;
        costLabel.color = new Color(255, 255, 200, 255);
        costNode.setPosition(0, -28, 0);
        btn.addChild(costNode);

        // 添加点击区域
        const btnTransform = btn.addComponent(UITransform);
        btnTransform.setContentSize(btnWidth, btnHeight);

        // 添加按钮组件
        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.95;
        btn.on(Button.EventType.CLICK, callback);

        btn.setPosition(x, y, 0);
        return btn;
    }

    /**
     * 显示事件结果（在现有面板上）
     */
    static showEventResult(panel: Node, option: EventOption, success: boolean, cost: number, heat: number, onClose: () => void) {
        if (!panel) return;
        
        const card = panel.getChildByName('Card');
        if (!card) return;
        
        // 隐藏按钮
        const btns = card.children.filter(c => c.name === 'OptionButton');
        btns.forEach(b => b.active = false);

        // 显示结果
        const resultNode = new Node('Result');
        const resultLabel = resultNode.addComponent(Label);
        
        let resultText = success ? '✅ ' : '❌ ';
        resultText += option.text + '\n\n';
        
        if (cost !== 0) {
            resultText += cost > 0 ? `💰 获得 ${cost} 金币\n` : `💰 花费 ${Math.abs(cost)} 金币\n`;
        }
        if (heat !== 0) {
            resultText += heat > 0 ? `🔥 热度 +${heat}\n` : `🔥 热度 ${heat}\n`;
        }

        resultLabel.string = resultText;
        resultLabel.fontSize = 20;
        resultLabel.color = success ? new Color(46, 204, 113, 255) : new Color(231, 76, 60, 255);
        resultNode.setPosition(0, -80, 0);
        card.addChild(resultNode);

        // 添加继续按钮
        const continueBtn = new Node('ContinueBtn');
        const continueBtnTransform = continueBtn.addComponent(UITransform);
        continueBtnTransform.setContentSize(160, 50);
        
        const continueBg = new Node('Bg');
        const continueBgGraphics = continueBg.addComponent(Graphics);
        continueBgGraphics.fillColor = new Color(52, 152, 219, 255);
        continueBgGraphics.roundRect(-80, -25, 160, 50, 10);
        continueBgGraphics.fill();
        continueBtn.addChild(continueBg);

        const continueLabel = new Node('Label');
        const continueLabelComp = continueLabel.addComponent(Label);
        continueLabelComp.string = '继续营业';
        continueLabelComp.fontSize = 18;
        continueLabelComp.color = new Color(255, 255, 255, 255);
        continueBtn.addChild(continueLabel);

        const continueButton = continueBtn.addComponent(Button);
        continueButton.transition = Button.Transition.SCALE;
        continueBtn.on(Button.EventType.CLICK, onClose);
        
        continueBtn.setPosition(0, -160, 0);
        card.addChild(continueBtn);
    }

    /**
     * 关闭事件面板（带动画）
     */
    static closePanel(panel: Node, onClosed?: () => void) {
        if (panel) {
            tween(panel)
                .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
                .call(() => {
                    panel.destroy();
                    onClosed?.();
                })
                .start();
        }
    }
}
