/**
 * LaowangNPC.ts
 * 老王 NPC 系统（教程用）
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, UITransform, Sprite, Color, Vec3, tween, Component } from 'cc';

/**
 * 老王 NPC 管理类
 */
export class LaowangNPC {
    private parentNode: Node = null;
    private container: Node = null;
    private dialogBox: Node = null;
    private dialogLabel: Label = null;
    private orderNode: Node = null;
    private hideCallback: () => void = null;
    
    constructor(parentNode: Node) {
        this.parentNode = parentNode;
    }
    
    /**
     * 创建老王 NPC 角色（包括头像和对话框）
     */
    create(): Node {
        if (this.container) return this.container;
        
        // 创建老王容器
        this.container = new Node('LaowangNPC');
        this.parentNode.addChild(this.container);
        this.container.setPosition(280, 180, 0);
        this.container.setSiblingIndex(9999);
        
        // 创建老王头像
        const avatarNode = new Node('Avatar');
        const avatarLabel = avatarNode.addComponent(Label);
        avatarLabel.string = '👨‍🍳';
        avatarLabel.fontSize = 60;
        avatarLabel.horizontalAlign = 1;
        avatarLabel.verticalAlign = 1;
        avatarNode.setPosition(0, -40, 0);
        this.container.addChild(avatarNode);
        
        // 创建名字标签
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = '老王';
        nameLabel.fontSize = 20;
        nameLabel.color = new Color(255, 255, 255, 255);
        nameLabel.horizontalAlign = 1;
        nameLabel.enableOutline = true;
        nameLabel.outlineColor = new Color(0, 0, 0, 200);
        nameLabel.outlineWidth = 2;
        nameNode.setPosition(0, -80, 0);
        this.container.addChild(nameNode);
        
        // 创建对话气泡
        this.dialogBox = new Node('DialogBubble');
        const bubbleTransform = this.dialogBox.addComponent(UITransform);
        bubbleTransform.setContentSize(280, 100);
        
        // 气泡背景
        const bubbleBg = this.dialogBox.addComponent(Sprite);
        bubbleBg.color = new Color(40, 40, 40, 220);
        
        // 对话文字
        const textNode = new Node('Text');
        this.dialogLabel = textNode.addComponent(Label);
        this.dialogLabel.fontSize = 20;
        this.dialogLabel.lineHeight = 26;
        this.dialogLabel.color = new Color(255, 255, 255, 255);
        this.dialogLabel.overflow = 2;
        this.dialogLabel.horizontalAlign = 0;
        this.dialogLabel.enableOutline = true;
        this.dialogLabel.outlineColor = new Color(0, 0, 0, 180);
        this.dialogLabel.outlineWidth = 1;
        const textTransform = textNode.getComponent(UITransform);
        if (textTransform) {
            textTransform.setContentSize(230, 80);
        }
        textNode.setPosition(0, 0, 0);
        this.dialogBox.addChild(textNode);
        
        this.dialogBox.setPosition(0, 50, 0);
        this.container.addChild(this.dialogBox);
        
        console.log('[LaowangNPC] ✅ 创建老王 NPC 角色');
        return this.container;
    }
    
    /**
     * 显示对话
     */
    showDialogue(text: string, duration: number = -1, scheduler?: Component) {
        if (!this.dialogBox) {
            this.create();
        }
        
        if (!this.dialogLabel) {
            this.dialogLabel = this.dialogBox.getComponentInChildren(Label);
        }
        
        this.dialogLabel.string = text;
        this.dialogBox.active = true;
        
        if (this.container) {
            this.container.active = true;
        }
        
        // 动画效果
        this.dialogBox.setScale(0.8, 0.8, 1);
        tween(this.dialogBox)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        
        // 计算显示时间
        let displayTime = duration;
        if (duration < 0) {
            displayTime = Math.max(2, Math.min(8, text.length * 0.15 + 1));
        }
        
        if (displayTime > 0 && scheduler) {
            if (this.hideCallback) {
                scheduler.unschedule(this.hideCallback);
            }
            this.hideCallback = () => this.hideDialogue();
            scheduler.scheduleOnce(this.hideCallback, displayTime);
        }
    }
    
    /**
     * 隐藏对话
     */
    hideDialogue() {
        if (this.dialogBox && this.dialogBox.active) {
            tween(this.dialogBox)
                .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
                .call(() => { this.dialogBox.active = false; })
                .start();
        }
    }
    
    /**
     * 隐藏老王 NPC
     */
    hide() {
        console.log('[LaowangNPC] 👋 隐藏老王 NPC');
        
        if (this.orderNode) {
            this.orderNode.destroy();
            this.orderNode = null;
        }
        
        if (this.container) {
            this.container.destroy();
            this.container = null;
            console.log('[LaowangNPC] ✅ 老王已离开');
        }
        
        this.dialogBox = null;
        this.dialogLabel = null;
    }
    
    /**
     * 创建订单UI
     */
    createOrderUI(orderText: string): Node {
        console.log('[LaowangNPC] 创建老王订单UI:', orderText);
        
        if (this.orderNode) {
            this.orderNode.destroy();
        }
        
        if (!this.container) {
            this.create();
        }
        
        this.orderNode = new Node('LaowangOrder');
        const orderTransform = this.orderNode.addComponent(UITransform);
        orderTransform.setContentSize(200, 80);
        
        // 订单标题
        const titleNode = new Node('OrderTitle');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '📋 老王的订单';
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(100, 100, 100, 255);
        titleLabel.horizontalAlign = 1;
        titleNode.setPosition(0, 25, 0);
        this.orderNode.addChild(titleNode);
        
        // 订单内容
        const contentNode = new Node('OrderContent');
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = orderText;
        contentLabel.fontSize = 18;
        contentLabel.color = new Color(50, 50, 50, 255);
        contentLabel.horizontalAlign = 1;
        contentLabel.isBold = true;
        contentNode.setPosition(0, 0, 0);
        this.orderNode.addChild(contentNode);
        
        // 提示文字
        const hintNode = new Node('Hint');
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '🎯 拖动到打包盒交付';
        hintLabel.fontSize = 12;
        hintLabel.color = new Color(150, 150, 150, 255);
        hintLabel.horizontalAlign = 1;
        hintNode.setPosition(0, -30, 0);
        this.orderNode.addChild(hintNode);
        
        this.orderNode.setPosition(0, 140, 0);
        this.container.addChild(this.orderNode);
        
        console.log('[LaowangNPC] ✅ 老王订单UI已创建');
        return this.orderNode;
    }
    
    /**
     * 获取对话框节点
     */
    getDialogBox(): Node {
        return this.dialogBox;
    }
    
    /**
     * 获取对话标签
     */
    getDialogLabel(): Label {
        return this.dialogLabel;
    }
    
    /**
     * 获取容器节点
     */
    getContainer(): Node {
        return this.container;
    }
    
    /**
     * 获取订单节点
     */
    getOrderNode(): Node {
        return this.orderNode;
    }
    
    /**
     * 设置订单节点
     */
    setOrderNode(node: Node) {
        this.orderNode = node;
    }
}
