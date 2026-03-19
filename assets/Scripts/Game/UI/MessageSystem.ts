/**
 * MessageSystem.ts
 * 消息提示系统
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, UITransform, Color, Vec3, tween } from 'cc';

/**
 * 消息系统 - 处理游戏内提示消息显示
 */
export class MessageSystem {
    private parentNode: Node = null;
    private errorPanel: Node = null;
    private errorLabel: Label = null;
    
    constructor(parentNode: Node) {
        this.parentNode = parentNode;
    }
    
    /**
     * 显示消息
     * @param msg 消息内容
     * @param duration 显示时长（秒）
     */
    show(msg: string, duration: number = 2) {
        // 判断是否是顾客相关消息或非错误消息
        const isCustomer = msg.includes('顾客') || msg.includes('客人');
        const isError = msg.includes('⚠️') || msg.includes('❌') || 
                       msg.includes('请先') || msg.includes('未设置') || 
                       msg.includes('未绑定') || msg.includes('不能') || 
                       msg.includes('最多') || msg.includes('已有');
        
        if (isCustomer || !isError) {
            // 非错误消息只输出日志
            console.log(`[MessageSystem] ${msg}`);
            return;
        }
        
        // 错误消息显示提示框
        this.showErrorTip(msg, duration);
    }
    
    /**
     * 显示错误提示
     */
    private showErrorTip(text: string, duration: number = 2) {
        this.ensurePanel();
        
        if (!this.errorLabel) {
            this.errorLabel = this.errorPanel.getComponent(Label);
        }
        
        this.errorLabel.string = text;
        this.errorPanel.active = true;
        
        tween(this.errorPanel)
            .set({ scale: new Vec3(1, 1, 1) })
            .to(0.15, { scale: new Vec3(1.06, 1.06, 1) })
            .delay(duration)
            .to(0.15, { scale: new Vec3(1, 1, 1) })
            .call(() => { this.errorPanel.active = false; })
            .start();
    }
    
    /**
     * 确保面板已创建
     */
    private ensurePanel() {
        if (!this.errorPanel || !this.errorPanel.isValid) {
            this.errorPanel = new Node('ErrorPanel');
            const t = this.errorPanel.addComponent(UITransform);
            t.setContentSize(480, 80);
            this.errorLabel = this.errorPanel.addComponent(Label);
            this.errorLabel.fontSize = 24;
            this.errorLabel.color = new Color(255, 255, 255, 255);
            this.errorPanel.active = false;
            this.parentNode.addChild(this.errorPanel);
            this.errorPanel.setPosition(0, 260, 0);
            this.errorPanel.setSiblingIndex(9999);
        }
    }
    
    /**
     * 销毁消息系统
     */
    destroy() {
        if (this.errorPanel && this.errorPanel.isValid) {
            this.errorPanel.destroy();
            this.errorPanel = null;
            this.errorLabel = null;
        }
    }
}
