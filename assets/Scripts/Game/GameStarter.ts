import { _decorator, Component, Button, Label, find, Node, UITransform, Color, director } from 'cc';
import { TimeManager } from '../Manager/TimeManager';
import { SceneRouteService } from '../Manager/SceneRouteService';
const { ccclass, property } = _decorator;

/**
 * 游戏启动器 - 控制开始营业/重新开始按钮
 */
@ccclass('GameStarter')
export class GameStarter extends Component {
    @property(Button)
    startButton: Button = null;

    private isBusinessOpen: boolean = false;  // 是否营业中
    private restartPanel: Node = null;  // 重新开始选择面板

    onLoad() {
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this.onButtonClick, this);
            // 初始化按钮文字
            this.updateButtonText('🏪 开始营业');
        }
        
        // 默认为未营业状态
        this.isBusinessOpen = false;
    }
    
    start() {
        // 延迟同步状态（等待CookingControllerV2自动启动）
        this.scheduleOnce(() => {
            this.syncBusinessState();
        }, 0.6);
    }
    
    /**
     * 同步营业状态（与CookingControllerV2保持一致）
     */
    private syncBusinessState() {
        const canvasNode = find('Canvas') || find('CookingScene/Canvas');
        if (canvasNode) {
            const controller = canvasNode.getComponent('CookingControllerV2');
            if (controller && (controller as any).isBusinessOpen !== undefined) {
                const actualState = (controller as any).isBusinessOpen;
                if (actualState !== this.isBusinessOpen) {
                    console.log(`[GameStarter] 同步营业状态: ${actualState}`);
                    this.isBusinessOpen = actualState;
                    this.updateButtonText(actualState ? '🔄 重新开始' : '🏪 开始营业');
                }
            }
        }
    }

    private onButtonClick() {
        const timeManager = TimeManager.instance;
        if (!timeManager) {
            console.error('[GameStarter] TimeManager未找到！');
            return;
        }

        if (!this.isBusinessOpen) {
            // 开始营业
            console.log('[GameStarter] 点击开始营业');
            
            // 🔥 使用forceRestart强制重启（重置时间和状态）
            timeManager.forceRestart();
            this.isBusinessOpen = true;
            
            // 🔥 直接调用 CookingControllerV2.setBusinessState(true)
            this.setCookingControllerBusinessState(true);
            
            // 修改按钮文字为"重新开始"
            this.updateButtonText('🔄 重新开始');
            console.log('[GameStarter] ✅ 营业已开始，时间重置为12:00');
        } else {
            // 🔥 显示重新开始选择面板
            console.log('[GameStarter] 点击重新开始');
            this.showRestartPanel();
        }
    }
    
    /**
     * 显示重新开始选择面板
     */
    private showRestartPanel() {
        // 暂停时间
        const timeManager = TimeManager.instance;
        if (timeManager) {
            timeManager.pauseTime();
        }
        
        // 如果面板已存在，直接显示
        if (this.restartPanel) {
            this.restartPanel.active = true;
            return;
        }
        
        // 创建面板
        const canvasNode = find('Canvas') || find('CookingScene/Canvas');
        if (!canvasNode) return;
        
        this.restartPanel = new Node('RestartPanel');
        this.restartPanel.addComponent(UITransform).setContentSize(400, 280);
        canvasNode.addChild(this.restartPanel);
        this.restartPanel.setPosition(0, 0, 0);
        this.restartPanel.setSiblingIndex(9999);
        
        // 背景遮罩
        const mask = new Node('Mask');
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(1920, 1080);
        const maskLabel = mask.addComponent(Label);
        maskLabel.string = '';
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => {
            this.hideRestartPanel();
        });
        this.restartPanel.addChild(mask);
        
        // 面板背景
        const bg = new Node('Background');
        const bgTransform = bg.addComponent(UITransform);
        bgTransform.setContentSize(400, 280);
        const bgLabel = bg.addComponent(Label);
        bgLabel.string = '████████████████████\n████████████████████\n████████████████████\n████████████████████\n████████████████████\n████████████████████\n████████████████████';
        bgLabel.fontSize = 24;
        bgLabel.color = new Color(40, 40, 40, 240);
        bgLabel.lineHeight = 40;
        this.restartPanel.addChild(bg);
        
        // 标题
        const title = new Node('Title');
        title.addComponent(UITransform);
        const titleLabel = title.addComponent(Label);
        titleLabel.string = '🔄 重新开始关卡';
        titleLabel.fontSize = 28;
        titleLabel.color = new Color(255, 255, 255, 255);
        title.setPosition(0, 100, 0);
        this.restartPanel.addChild(title);
        
        // 提示文字
        const hint = new Node('Hint');
        hint.addComponent(UITransform);
        const hintLabel = hint.addComponent(Label);
        hintLabel.string = '选择从哪个阶段开始：';
        hintLabel.fontSize = 20;
        hintLabel.color = new Color(200, 200, 200, 255);
        hint.setPosition(0, 50, 0);
        this.restartPanel.addChild(hint);
        
        // 购买阶段按钮
        const shopBtn = this.createPanelButton('🛒 购买阶段', new Color(46, 204, 113, 255), 0, -10);
        shopBtn.on(Node.EventType.TOUCH_END, () => {
            this.restartFromPhase('shop');
        });
        this.restartPanel.addChild(shopBtn);
        
        // 制作阶段按钮
        const cookingBtn = this.createPanelButton('🍳 制作阶段', new Color(52, 152, 219, 255), 0, -70);
        cookingBtn.on(Node.EventType.TOUCH_END, () => {
            this.restartFromPhase('cooking');
        });
        this.restartPanel.addChild(cookingBtn);
        
        // 取消按钮
        const cancelBtn = this.createPanelButton('❌ 取消', new Color(149, 165, 166, 255), 0, -130);
        cancelBtn.on(Node.EventType.TOUCH_END, () => {
            this.hideRestartPanel();
        });
        this.restartPanel.addChild(cancelBtn);
    }
    
    /**
     * 创建面板按钮
     */
    private createPanelButton(text: string, color: Color, x: number, y: number): Node {
        const btn = new Node('Button');
        const transform = btn.addComponent(UITransform);
        transform.setContentSize(200, 45);
        const label = btn.addComponent(Label);
        label.string = text;
        label.fontSize = 22;
        label.color = color;
        btn.addComponent(Button);
        btn.setPosition(x, y, 0);
        return btn;
    }
    
    /**
     * 隐藏重新开始面板
     */
    private hideRestartPanel() {
        if (this.restartPanel) {
            this.restartPanel.active = false;
        }
        
        // 恢复时间
        const timeManager = TimeManager.instance;
        if (timeManager) {
            timeManager.resumeTime();
        }
    }
    
    /**
     * 从指定阶段重新开始
     */
    private restartFromPhase(phase: 'shop' | 'cooking') {
        console.log(`[GameStarter] 重新开始关卡，从${phase === 'shop' ? '购买' : '制作'}阶段开始`);
        
        if (phase === 'shop') {
            SceneRouteService.goShop();
        } else {
            SceneRouteService.goBusiness();
        }
    }
    
    /**
     * 🔥 设置 CookingControllerV2 的营业状态
     */
    private setCookingControllerBusinessState(isOpen: boolean) {
        // 查找 Canvas 节点上的 CookingControllerV2
        const canvasNode = find('Canvas') || find('CookingScene/Canvas');
        if (canvasNode) {
            const controller = canvasNode.getComponent('CookingControllerV2');
            if (controller) {
                console.log(`[GameStarter] ✅ 找到 CookingControllerV2，设置营业状态: ${isOpen}`);
                (controller as any).setBusinessState(isOpen);
            } else {
                console.error('[GameStarter] ❌ Canvas 上没有 CookingControllerV2 组件');
            }
        } else {
            console.error('[GameStarter] ❌ 找不到 Canvas 节点');
        }
    }

    private updateButtonText(text: string) {
        if (!this.startButton) return;
        
        const label = this.startButton.node.getComponentInChildren(Label);
        if (label) {
            label.string = text;
            console.log(`[GameStarter] 按钮文字已更新为: ${text}`);
        }
    }
}
