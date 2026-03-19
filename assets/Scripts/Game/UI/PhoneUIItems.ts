/**
 * PhoneUIItems.ts
 * 手机UI列表项组件
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, UITransform, Graphics, Color, Button, Vec3, EventTouch } from 'cc';
import { PHONE_CONFIG } from '../Config/CookingConfig';

/**
 * 消息数据接口
 */
export interface MessageData {
    id: string;
    sender: string;
    senderIcon: string;
    content: string;
    time: string;
    isRead: boolean;
}

/**
 * 评价数据接口
 */
export interface ReviewData {
    type: 'super' | 'good' | 'bad';
    text: string;
    timestamp: number;
}

/**
 * 手机UI列表项工厂类
 */
export class PhoneUIItems {
    
    /**
     * 💬 创建消息项
     */
    static createMessageItem(msg: MessageData, index: number): Node {
        const item = new Node(`MsgItem${index}`);
        const itemWidth = PHONE_CONFIG.background.width - 30;
        const itemHeight = 70;
        
        const transform = item.addComponent(UITransform);
        transform.setContentSize(itemWidth, itemHeight);
        
        // 背景节点
        const bgNode = new Node('Background');
        item.addChild(bgNode);
        const bg = bgNode.addComponent(Graphics);
        bg.fillColor = msg.isRead ? new Color(255, 255, 255, 255) : new Color(240, 248, 255, 255);
        bg.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 10);
        bg.fill();
        bg.strokeColor = new Color(230, 230, 235, 255);
        bg.lineWidth = 1;
        bg.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 10);
        bg.stroke();
        
        // 发送人图标
        const iconNode = new Node('Icon');
        item.addChild(iconNode);
        iconNode.setPosition(-itemWidth / 2 + 30, 0, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = msg.senderIcon;
        iconLabel.fontSize = 28;
        
        // 发送人名称
        const senderNode = new Node('Sender');
        item.addChild(senderNode);
        senderNode.setPosition(-itemWidth / 2 + 80, 15, 0);
        const senderLabel = senderNode.addComponent(Label);
        senderLabel.string = msg.sender;
        senderLabel.fontSize = 14;
        senderLabel.color = new Color(30, 30, 40, 255);
        senderLabel.isBold = true;
        const senderTransform = senderNode.getComponent(UITransform);
        senderTransform.anchorX = 0;
        
        // 时间
        const timeNode = new Node('Time');
        item.addChild(timeNode);
        timeNode.setPosition(itemWidth / 2 - 40, 15, 0);
        const timeLabel = timeNode.addComponent(Label);
        timeLabel.string = msg.time;
        timeLabel.fontSize = 11;
        timeLabel.color = new Color(142, 142, 147, 255);
        
        // 消息内容预览
        const contentNode = new Node('Content');
        item.addChild(contentNode);
        contentNode.setPosition(-itemWidth / 2 + 80, -10, 0);
        const contentLabel = contentNode.addComponent(Label);
        const previewText = msg.content.length > 25 ? msg.content.substring(0, 25) + '...' : msg.content;
        contentLabel.string = previewText;
        contentLabel.fontSize = 12;
        contentLabel.color = new Color(100, 100, 110, 255);
        const contentTransform = contentNode.getComponent(UITransform);
        contentTransform.anchorX = 0;
        
        // 未读标记
        if (!msg.isRead) {
            const unreadDot = new Node('UnreadDot');
            item.addChild(unreadDot);
            unreadDot.setPosition(itemWidth / 2 - 15, 0, 0);
            const dotGraphics = unreadDot.addComponent(Graphics);
            dotGraphics.fillColor = new Color(255, 59, 48, 255);
            dotGraphics.circle(0, 0, 5);
            dotGraphics.fill();
        }
        
        return item;
    }
    
    /**
     * 创建美团风格评价项（可点击展开）
     */
    static createMeituanReviewItem(review: ReviewData, index: number, onClickCallback?: (review: ReviewData) => void): Node {
        const item = new Node(`ReviewItem${index}`);
        const itemWidth = PHONE_CONFIG.background.width - 30;
        const itemHeight = 60;
        
        // 背景
        const bg = new Node('Background');
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.strokeColor = new Color(240, 240, 240, 255);
        bgGraphics.lineWidth = 1;
        bgGraphics.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 8);
        bgGraphics.fill();
        bgGraphics.stroke();
        item.addChild(bg);
        
        // 评价类型图标和颜色
        let icon = '😊';
        let typeColor = new Color(52, 199, 89, 255);
        let typeName = '好评';
        if (review.type === 'super') {
            icon = '😍';
            typeColor = new Color(255, 149, 0, 255);
            typeName = '超赞';
        } else if (review.type === 'bad') {
            icon = '😞';
            typeColor = new Color(255, 59, 48, 255);
            typeName = '差评';
        }
        
        // 表情图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 24;
        iconNode.setPosition(-itemWidth / 2 + 25, 5, 0);
        item.addChild(iconNode);
        
        // 评价类型标签
        const typeNode = new Node('Type');
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = typeName;
        typeLabel.fontSize = 12;
        typeLabel.color = typeColor;
        typeLabel.isBold = true;
        typeNode.setPosition(-itemWidth / 2 + 25, -15, 0);
        item.addChild(typeNode);
        
        // 评价内容预览
        const contentNode = new Node('Content');
        const contentLabel = contentNode.addComponent(Label);
        const previewText = review.text.length > 15 ? review.text.substring(0, 15) + '...' : review.text;
        contentLabel.string = previewText;
        contentLabel.fontSize = 14;
        contentLabel.color = new Color(0, 0, 0, 255);
        contentNode.setPosition(20, 5, 0);
        item.addChild(contentNode);
        
        // 时间
        const timeNode = new Node('Time');
        const timeLabel = timeNode.addComponent(Label);
        const date = new Date(review.timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        timeLabel.string = `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        timeLabel.fontSize = 11;
        timeLabel.color = new Color(142, 142, 147, 255);
        timeNode.setPosition(20, -15, 0);
        item.addChild(timeNode);
        
        // 点击查看详情箭头
        const arrowNode = new Node('Arrow');
        const arrowLabel = arrowNode.addComponent(Label);
        arrowLabel.string = '›';
        arrowLabel.fontSize = 24;
        arrowLabel.color = new Color(199, 199, 204, 255);
        arrowNode.setPosition(itemWidth / 2 - 20, 0, 0);
        item.addChild(arrowNode);
        
        // 添加点击事件显示详情
        if (onClickCallback) {
            item.addComponent(Button);
            item.on(Node.EventType.TOUCH_END, () => {
                onClickCallback(review);
            });
        }
        
        return item;
    }
    
    /**
     * 显示评价详情弹窗
     */
    static createReviewDetailPopup(review: ReviewData, bgWidth: number, onClose: () => void): Node {
        const detailPopup = new Node('ReviewDetailPopup');
        
        // 半透明背景
        const overlay = new Node('Overlay');
        const overlayGraphics = overlay.addComponent(Graphics);
        overlayGraphics.fillColor = new Color(0, 0, 0, 150);
        overlayGraphics.rect(-bgWidth / 2, -360, bgWidth, 720);
        overlayGraphics.fill();
        detailPopup.addChild(overlay);
        
        // 弹窗面板
        const panel = new Node('Panel');
        const panelGraphics = panel.addComponent(Graphics);
        panelGraphics.fillColor = new Color(255, 255, 255, 255);
        panelGraphics.roundRect(-150, -100, 300, 200, 15);
        panelGraphics.fill();
        detailPopup.addChild(panel);
        
        // 评价类型
        let icon = '😊';
        let typeName = '好评';
        if (review.type === 'super') { icon = '😍'; typeName = '超级好评'; }
        else if (review.type === 'bad') { icon = '😞'; typeName = '差评'; }
        
        const typeNode = new Node('TypeIcon');
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = icon + ' ' + typeName;
        typeLabel.fontSize = 20;
        typeLabel.color = new Color(0, 0, 0, 255);
        typeLabel.isBold = true;
        typeNode.setPosition(0, 60, 0);
        detailPopup.addChild(typeNode);
        
        // 评价内容
        const contentNode = new Node('Content');
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = review.text;
        contentLabel.fontSize = 16;
        contentLabel.color = new Color(50, 50, 50, 255);
        contentLabel.overflow = Label.Overflow.CLAMP;
        const contentTransform = contentNode.getComponent(UITransform);
        contentTransform.setContentSize(260, 80);
        contentNode.setPosition(0, 0, 0);
        detailPopup.addChild(contentNode);
        
        // 关闭按钮
        const closeBtn = new Node('CloseBtn');
        const closeBtnGraphics = closeBtn.addComponent(Graphics);
        closeBtnGraphics.fillColor = new Color(0, 122, 255, 255);
        closeBtnGraphics.roundRect(-50, -18, 100, 36, 18);
        closeBtnGraphics.fill();
        
        const closeBtnLabel = new Node('Label');
        const closeLabel = closeBtnLabel.addComponent(Label);
        closeLabel.string = '关闭';
        closeLabel.fontSize = 16;
        closeLabel.color = new Color(255, 255, 255, 255);
        closeBtn.addChild(closeBtnLabel);
        
        closeBtn.setPosition(0, -60, 0);
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, onClose);
        detailPopup.addChild(closeBtn);
        
        return detailPopup;
    }
    
    /**
     * 创建语言切换项（iOS风格分段控制器）
     */
    static createLanguageToggleItem(x: number, y: number, currentLanguage: string, onLanguageChange: (lang: string) => void): Node {
        const item = new Node('LanguageToggleItem');
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
        bg.strokeColor = new Color(229, 231, 235, 255);
        bg.lineWidth = 1;
        bg.roundRect(-itemWidth/2, -itemHeight/2, itemWidth, itemHeight, 10);
        bg.stroke();
        
        // 标签
        const labelNode = new Node('Label');
        item.addChild(labelNode);
        labelNode.setPosition(-itemWidth/2 + 16, 0, 0);
        const label = labelNode.addComponent(Label);
        label.string = '语言 / Language';
        label.fontSize = 15;
        label.color = new Color(31, 41, 55, 255);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        const labelTransform = labelNode.getComponent(UITransform);
        labelTransform.anchorX = 0;
        
        // 分段控制器容器
        const segmentContainer = new Node('SegmentContainer');
        item.addChild(segmentContainer);
        segmentContainer.setPosition(itemWidth/2 - 75, 0, 0);
        
        // 分段控制器背景
        const segmentBg = segmentContainer.addComponent(Graphics);
        segmentBg.fillColor = new Color(239, 239, 244, 255);
        segmentBg.roundRect(-60, -14, 120, 28, 7);
        segmentBg.fill();
        
        // 中文选项
        const zhBtn = new Node('ZhBtn');
        segmentContainer.addChild(zhBtn);
        zhBtn.setPosition(-30, 0, 0);
        const zhBtnTransform = zhBtn.addComponent(UITransform);
        zhBtnTransform.setContentSize(58, 26);
        
        const zhBg = zhBtn.addComponent(Graphics);
        if (currentLanguage === 'zh') {
            zhBg.fillColor = new Color(255, 255, 255, 255);
            zhBg.roundRect(-29, -13, 58, 26, 6);
            zhBg.fill();
        }
        
        const zhLabel = new Node('Label');
        zhBtn.addChild(zhLabel);
        const zhLabelComp = zhLabel.addComponent(Label);
        zhLabelComp.string = '中文';
        zhLabelComp.fontSize = 13;
        zhLabelComp.color = currentLanguage === 'zh' ? new Color(0, 122, 255, 255) : new Color(142, 142, 147, 255);
        zhLabelComp.isBold = currentLanguage === 'zh';
        
        // 英文选项
        const enBtn = new Node('EnBtn');
        segmentContainer.addChild(enBtn);
        enBtn.setPosition(30, 0, 0);
        const enBtnTransform = enBtn.addComponent(UITransform);
        enBtnTransform.setContentSize(58, 26);
        
        const enBg = enBtn.addComponent(Graphics);
        if (currentLanguage === 'en') {
            enBg.fillColor = new Color(255, 255, 255, 255);
            enBg.roundRect(-29, -13, 58, 26, 6);
            enBg.fill();
        }
        
        const enLabel = new Node('Label');
        enBtn.addChild(enLabel);
        const enLabelComp = enLabel.addComponent(Label);
        enLabelComp.string = 'EN';
        enLabelComp.fontSize = 13;
        enLabelComp.color = currentLanguage === 'en' ? new Color(0, 122, 255, 255) : new Color(142, 142, 147, 255);
        enLabelComp.isBold = currentLanguage === 'en';
        
        // 点击事件 - 需要Button组件
        zhBtn.addComponent(Button);
        enBtn.addComponent(Button);
        zhBtn.on(Node.EventType.TOUCH_END, () => onLanguageChange('zh'));
        enBtn.on(Node.EventType.TOUCH_END, () => onLanguageChange('en'));
        
        item.setPosition(x, y, 0);
        return item;
    }
    
    /**
     * 创建可交互音量设置项（拖动滑块）
     */
    static createInteractiveVolumeItem(title: string, type: 'bgm' | 'sfx', volume: number, x: number, y: number, onVolumeChange: (type: string, value: number) => void): Node {
        const item = new Node(`${title}VolumeItem`);
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
        bg.strokeColor = new Color(229, 231, 235, 255);
        bg.lineWidth = 1;
        bg.roundRect(-itemWidth/2, -itemHeight/2, itemWidth, itemHeight, 10);
        bg.stroke();
        
        // 标签
        const labelNode = new Node('Label');
        item.addChild(labelNode);
        labelNode.setPosition(-itemWidth/2 + 16, 0, 0);
        const label = labelNode.addComponent(Label);
        label.string = title;
        label.fontSize = 15;
        label.color = new Color(31, 41, 55, 255);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        const labelTransform = labelNode.getComponent(UITransform);
        labelTransform.anchorX = 0;
        
        // 滑块容器
        const sliderWidth = 120;
        const sliderContainer = new Node('SliderContainer');
        item.addChild(sliderContainer);
        sliderContainer.setPosition(itemWidth/2 - 90, 0, 0);
        
        // 滑块背景轨道
        const track = new Node('Track');
        sliderContainer.addChild(track);
        const trackGraphics = track.addComponent(Graphics);
        trackGraphics.fillColor = new Color(229, 231, 235, 255);
        trackGraphics.roundRect(-sliderWidth/2, -2, sliderWidth, 4, 2);
        trackGraphics.fill();
        
        // 已填充部分
        const fill = new Node('Fill');
        sliderContainer.addChild(fill);
        const fillGraphics = fill.addComponent(Graphics);
        fillGraphics.fillColor = new Color(0, 122, 255, 255);
        const fillWidth = sliderWidth * (volume / 100);
        fillGraphics.roundRect(-sliderWidth/2, -2, fillWidth, 4, 2);
        fillGraphics.fill();
        
        // 滑块圆点
        const thumb = new Node('Thumb');
        sliderContainer.addChild(thumb);
        const thumbX = -sliderWidth/2 + fillWidth;
        thumb.setPosition(thumbX, 0, 0);
        const thumbGraphics = thumb.addComponent(Graphics);
        thumbGraphics.fillColor = new Color(255, 255, 255, 255);
        thumbGraphics.circle(0, 0, 10);
        thumbGraphics.fill();
        thumbGraphics.strokeColor = new Color(200, 200, 200, 255);
        thumbGraphics.lineWidth = 1;
        thumbGraphics.circle(0, 0, 10);
        thumbGraphics.stroke();
        
        // 数值显示
        const valueNode = new Node('Value');
        item.addChild(valueNode);
        valueNode.setPosition(itemWidth/2 - 16, 0, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = `${volume}%`;
        valueLabel.fontSize = 13;
        valueLabel.color = new Color(107, 114, 128, 255);
        valueLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        const valueTransform = valueNode.getComponent(UITransform);
        valueTransform.anchorX = 1;
        
        // 滑块拖动逻辑
        const sliderContainerTransform = sliderContainer.addComponent(UITransform);
        sliderContainerTransform.setContentSize(sliderWidth + 20, 30);
        sliderContainer.addComponent(Button);  // 需要Button组件接收触摸事件
        
        sliderContainer.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            event.propagationStopped = true;  // 阻止事件冒泡
            PhoneUIItems.updateSliderFromTouch(event, sliderContainer, sliderWidth, fillGraphics, thumb, valueLabel, type, onVolumeChange);
        });
        sliderContainer.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            event.propagationStopped = true;  // 阻止事件冒泡
            PhoneUIItems.updateSliderFromTouch(event, sliderContainer, sliderWidth, fillGraphics, thumb, valueLabel, type, onVolumeChange);
        });
        
        item.setPosition(x, y, 0);
        return item;
    }
    
    /**
     * 根据触摸更新滑块
     */
    private static updateSliderFromTouch(
        event: EventTouch,
        sliderContainer: Node,
        sliderWidth: number,
        fillGraphics: Graphics,
        thumb: Node,
        valueLabel: Label,
        type: string,
        onVolumeChange: (type: string, value: number) => void
    ) {
        // 直接使用event.getUILocation()获取触摸位置
        const touchPos = event.getUILocation();
        const uiTransform = sliderContainer.getComponent(UITransform);
        if (!uiTransform) return;
        
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        
        let ratio = (localPos.x + sliderWidth/2) / sliderWidth;
        ratio = Math.max(0, Math.min(1, ratio));
        const newVolume = Math.round(ratio * 100);
        
        // 更新视觉
        fillGraphics.clear();
        fillGraphics.fillColor = new Color(0, 122, 255, 255);
        const fillWidthNew = sliderWidth * ratio;
        fillGraphics.roundRect(-sliderWidth/2, -2, fillWidthNew, 4, 2);
        fillGraphics.fill();
        
        thumb.setPosition(-sliderWidth/2 + fillWidthNew, 0, 0);
        valueLabel.string = `${newVolume}%`;
        
        onVolumeChange(type, newVolume);
    }
}
