import { _decorator, Component, Node, Label, Graphics, Color, UITransform, ScrollView, Vec3, tween, Sprite, Button } from 'cc';
import { EventMessage, EventSender } from './RandomEventSystemV2';

const { ccclass, property } = _decorator;

/**
 * 📱 手机讯息系统UI
 * 显示事件发起人的消息历史
 */
@ccclass('PhoneMessageUI')
export class PhoneMessageUI extends Component {
    private messageContainer: Node = null;
    private messages: EventMessage[] = [];
    private messageNodes: Node[] = [];

    /**
     * 创建消息列表容器
     */
    public createMessageList(scrollContent: Node) {
        this.messageContainer = scrollContent;
    }

    /**
     * 添加新消息
     */
    public addMessage(message: EventMessage) {
        this.messages.unshift(message);
        
        // 创建消息节点
        const messageNode = this.createMessageNode(message);
        
        // 插入到容器顶部
        if (this.messageContainer) {
            this.messageContainer.insertChild(messageNode, 0);
            this.messageNodes.unshift(messageNode);
            
            // 重新排列位置
            this.repositionMessages();
            
            // 入场动画
            messageNode.setScale(0.8, 0.8, 1);
            messageNode.setPosition(messageNode.position.x - 50, messageNode.position.y, 0);
            tween(messageNode)
                .to(0.3, { scale: new Vec3(1, 1, 1), position: new Vec3(0, messageNode.position.y, 0) }, { easing: 'backOut' })
                .start();
        }

        // 限制显示数量
        if (this.messageNodes.length > 30) {
            const oldNode = this.messageNodes.pop();
            if (oldNode) oldNode.destroy();
            this.messages.pop();
        }
    }

    /**
     * 创建单个消息节点
     */
    private createMessageNode(message: EventMessage): Node {
        const node = new Node('Message_' + message.eventId);
        
        const transform = node.addComponent(UITransform);
        transform.setContentSize(280, 90);
        transform.anchorX = 0.5;
        transform.anchorY = 1;

        // 背景
        const bg = node.addComponent(Graphics);
        const bgColor = this.getStatusColor(message.status);
        bg.fillColor = bgColor;
        bg.roundRect(-140, -90, 280, 90, 8);
        bg.fill();

        // 边框
        bg.strokeColor = new Color(80, 80, 100, 255);
        bg.lineWidth = 1;
        bg.roundRect(-140, -90, 280, 90, 8);
        bg.stroke();

        // 发送人图标和名字
        const senderNode = new Node('Sender');
        node.addChild(senderNode);
        senderNode.setPosition(-110, -15, 0);
        const senderLabel = senderNode.addComponent(Label);
        senderLabel.string = `${message.sender.icon} ${message.sender.name}`;
        senderLabel.fontSize = 14;
        senderLabel.color = new Color(255, 220, 100, 255);
        const senderTransform = senderNode.addComponent(UITransform);
        senderTransform.anchorX = 0;

        // 身份标签
        const roleNode = new Node('Role');
        node.addChild(roleNode);
        roleNode.setPosition(50, -15, 0);
        const roleLabel = roleNode.addComponent(Label);
        roleLabel.string = `(${message.sender.role})`;
        roleLabel.fontSize = 12;
        roleLabel.color = new Color(150, 150, 170, 255);

        // 时间
        const timeNode = new Node('Time');
        node.addChild(timeNode);
        timeNode.setPosition(110, -15, 0);
        const timeLabel = timeNode.addComponent(Label);
        timeLabel.string = message.day === 1 ? message.time : `第${message.day}天`;
        timeLabel.fontSize = 11;
        timeLabel.color = new Color(130, 130, 150, 255);

        // 消息内容
        const contentNode = new Node('Content');
        node.addChild(contentNode);
        contentNode.setPosition(-110, -45, 0);
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = this.truncateText(message.content, 40);
        contentLabel.fontSize = 13;
        contentLabel.color = new Color(230, 230, 240, 255);
        contentLabel.overflow = Label.Overflow.CLAMP;
        const contentTransform = contentNode.addComponent(UITransform);
        contentTransform.anchorX = 0;
        contentTransform.setContentSize(260, 30);

        // 状态标签
        const statusNode = new Node('Status');
        node.addChild(statusNode);
        statusNode.setPosition(-110, -75, 0);
        const statusLabel = statusNode.addComponent(Label);
        statusLabel.string = this.getStatusText(message);
        statusLabel.fontSize = 11;
        statusLabel.color = this.getStatusTextColor(message.status);
        const statusTransform = statusNode.addComponent(UITransform);
        statusTransform.anchorX = 0;

        return node;
    }

    /**
     * 获取状态背景颜色
     */
    private getStatusColor(status: 'active' | 'pending' | 'completed'): Color {
        switch (status) {
            case 'active': return new Color(50, 60, 80, 240);
            case 'pending': return new Color(60, 55, 40, 240);
            case 'completed': return new Color(40, 55, 45, 240);
            default: return new Color(50, 50, 60, 240);
        }
    }

    /**
     * 获取状态文字
     */
    private getStatusText(message: EventMessage): string {
        switch (message.status) {
            case 'active': return '● 进行中';
            case 'pending': return `⏳ ${message.effectSummary || '待结算'}`;
            case 'completed': return `✓ ${message.effectSummary || '已完成'}`;
            default: return '';
        }
    }

    /**
     * 获取状态文字颜色
     */
    private getStatusTextColor(status: 'active' | 'pending' | 'completed'): Color {
        switch (status) {
            case 'active': return new Color(100, 200, 255, 255);
            case 'pending': return new Color(255, 200, 100, 255);
            case 'completed': return new Color(100, 255, 150, 255);
            default: return new Color(180, 180, 180, 255);
        }
    }

    /**
     * 截断文本
     */
    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * 重新排列消息位置
     */
    private repositionMessages() {
        let y = 0;
        for (const node of this.messageNodes) {
            node.setPosition(0, y, 0);
            y -= 100; // 每条消息高度90 + 间距10
        }

        // 更新容器高度
        if (this.messageContainer) {
            const transform = this.messageContainer.getComponent(UITransform);
            if (transform) {
                const height = Math.max(400, this.messageNodes.length * 100);
                transform.setContentSize(transform.width, height);
            }
        }
    }

    /**
     * 更新消息状态
     */
    public updateMessageStatus(eventId: string, status: 'active' | 'pending' | 'completed', effectSummary?: string) {
        // 更新数据
        const message = this.messages.find(m => m.eventId === eventId);
        if (message) {
            message.status = status;
            if (effectSummary) message.effectSummary = effectSummary;
        }

        // 更新UI - 找到对应节点并重建
        const index = this.messages.findIndex(m => m.eventId === eventId);
        if (index >= 0 && this.messageNodes[index] && message) {
            const oldNode = this.messageNodes[index];
            const newNode = this.createMessageNode(message);
            newNode.setPosition(oldNode.position);
            
            if (this.messageContainer) {
                this.messageContainer.insertChild(newNode, index);
            }
            
            oldNode.destroy();
            this.messageNodes[index] = newNode;
        }
    }

    /**
     * 清空所有消息
     */
    public clearMessages() {
        for (const node of this.messageNodes) {
            node.destroy();
        }
        this.messageNodes = [];
        this.messages = [];
    }

    /**
     * 获取消息数量
     */
    public getMessageCount(): number {
        return this.messages.length;
    }

    /**
     * 设置消息列表
     */
    public setMessages(messages: EventMessage[]) {
        this.clearMessages();
        for (const msg of messages) {
            const node = this.createMessageNode(msg);
            if (this.messageContainer) {
                this.messageContainer.addChild(node);
            }
            this.messageNodes.push(node);
            this.messages.push(msg);
        }
        this.repositionMessages();
    }
}
