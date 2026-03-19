/**
 * 主菜单自动配置脚本
 * 使用说明：
 * 1. 在Cocos Creator中打开MainMenu场景
 * 2. 选中Canvas节点
 * 3. 添加此脚本组件
 * 4. 点击"执行"按钮或在代码中调用 autoSetup()
 * 5. 配置完成后移除此组件
 */

import { _decorator, Component, Node, director, Canvas, UITransform, Label, Button, Sprite, Color, Widget, ScrollView, Layout, Toggle, Slider, EditBox } from 'cc';
const { ccclass, property, executeInEditMode, menu } = _decorator;

@ccclass('MainMenuAutoSetup')
@executeInEditMode
@menu('工具/主菜单自动配置')
export class MainMenuAutoSetup extends Component {
    
    @property
    enableDebugLog = true;

    /**
     * 在编辑器中点击执行
     */
    @property
    get execute() {
        return false;
    }
    set execute(value: boolean) {
        if (value) {
            this.autoSetup();
        }
    }

    /**
     * 自动配置主菜单
     */
    autoSetup() {
        this.log('🚀 开始自动配置主菜单...');
        
        const canvas = this.node.getComponent(Canvas) ? this.node : this.node.getParent();
        if (!canvas) {
            console.error('❌ 请将此脚本挂载到Canvas节点上！');
            return;
        }

        // 1. 查找或创建MainMenuUI节点
        let mainMenuUI = canvas.getChildByName('MainMenuUI');
        if (!mainMenuUI) {
            mainMenuUI = new Node('MainMenuUI');
            canvas.addChild(mainMenuUI);
            this.log('✅ 创建MainMenuUI节点');
        }

        // 2. 删除旧的LevelPanel
        const oldLevelPanel = canvas.getChildByName('LevelPanel');
        if (oldLevelPanel) {
            oldLevelPanel.destroy();
            this.log('✅ 删除旧的LevelPanel');
        }

        // 3. 创建或更新Title
        this.setupTitle(canvas);

        // 4. 创建按钮组
        this.setupButtons(canvas);

        // 5. 创建SettingsPanel
        this.setupSettingsPanel(canvas);

        // 6. 创建SaveListPanel
        this.setupSaveListPanel(canvas);

        this.log('🎉 主菜单配置完成！请在属性检查器中绑定MainMenuUI组件的属性。');
    }

    /**
     * 设置标题
     */
    private setupTitle(canvas: Node) {
        let title = canvas.getChildByName('Title');
        if (!title) {
            title = new Node('Title');
            canvas.addChild(title);
        }

        let label = title.getComponent(Label);
        if (!label) {
            label = title.addComponent(Label);
        }

        label.string = '东北料理王';
        label.fontSize = 48;
        label.color = new Color(100, 50, 0, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        title.setPosition(0, 250, 0);
        this.log('✅ 标题设置完成');
    }

    /**
     * 创建按钮组
     */
    private setupButtons(canvas: Node) {
        let buttonGroup = canvas.getChildByName('ButtonGroup');
        if (!buttonGroup) {
            buttonGroup = new Node('ButtonGroup');
            canvas.addChild(buttonGroup);
        }
        buttonGroup.setPosition(0, -50, 0);

        // 按钮配置
        const buttons = [
            { name: 'StartButton', text: '🎮 开始游戏', y: 100, color: new Color(100, 200, 100) },
            { name: 'ContinueButton', text: '▶️ 继续游戏', y: 20, color: new Color(100, 150, 200) },
            { name: 'LoadSaveButton', text: '💾 读取存档', y: -60, color: new Color(200, 200, 100) },
            { name: 'SettingsButton', text: '⚙️ 设置', y: -140, color: new Color(150, 150, 150) },
            { name: 'QuitButton', text: '❌ 退出游戏', y: -220, color: new Color(200, 100, 100) }
        ];

        buttons.forEach(config => {
            // 查找已存在的按钮或创建新按钮
            let btn = buttonGroup.getChildByName(config.name);
            if (!btn) {
                btn = canvas.getChildByName(config.name);
                if (btn) {
                    // 移动到ButtonGroup下
                    btn.parent = buttonGroup;
                } else {
                    // 创建新按钮
                    btn = this.createButton(config.name, config.text, config.color);
                    buttonGroup.addChild(btn);
                }
            }
            btn.setPosition(0, config.y, 0);
        });

        this.log('✅ 按钮组创建完成');
    }

    /**
     * 创建单个按钮
     */
    private createButton(name: string, text: string, color: Color): Node {
        const btnNode = new Node(name);
        
        const transform = btnNode.addComponent(UITransform);
        transform.setContentSize(300, 60);

        const sprite = btnNode.addComponent(Sprite);
        sprite.color = color;
        sprite.type = Sprite.Type.SLICED;

        const button = btnNode.addComponent(Button);
        button.transition = Button.Transition.COLOR;

        // 创建文字
        const labelNode = new Node('Label');
        btnNode.addChild(labelNode);

        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 24;
        label.color = Color.WHITE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        return btnNode;
    }

    /**
     * 创建设置面板
     */
    private setupSettingsPanel(canvas: Node) {
        let panel = canvas.getChildByName('SettingsPanel');
        if (!panel) {
            panel = new Node('SettingsPanel');
            canvas.addChild(panel);
        }

        // 默认隐藏
        panel.active = false;

        // 创建背景遮罩
        let background = panel.getChildByName('Background');
        if (!background) {
            background = new Node('Background');
            panel.addChild(background);

            const transform = background.addComponent(UITransform);
            transform.setContentSize(1280, 720);

            const sprite = background.addComponent(Sprite);
            sprite.color = new Color(0, 0, 0, 180);

            const widget = background.addComponent(Widget);
            widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
            widget.left = widget.right = widget.top = widget.bottom = 0;
        }

        // 创建主面板
        let mainPanel = panel.getChildByName('Panel');
        if (!mainPanel) {
            mainPanel = new Node('Panel');
            panel.addChild(mainPanel);

            const transform = mainPanel.addComponent(UITransform);
            transform.setContentSize(800, 600);

            const sprite = mainPanel.addComponent(Sprite);
            sprite.color = new Color(240, 240, 240);
        }

        // 创建标题
        let title = mainPanel.getChildByName('Title');
        if (!title) {
            title = new Node('Title');
            mainPanel.addChild(title);

            const label = title.addComponent(Label);
            label.string = '⚙️ 游戏设置';
            label.fontSize = 32;
            label.color = Color.BLACK;
            
            title.setPosition(0, 250, 0);
        }

        // 创建关闭按钮
        this.createSimpleButton(mainPanel, 'CloseButton', '关闭', 0, -250);

        this.log('✅ 设置面板基础结构创建完成');
        this.log('💡 提示：详细的设置项请参考配置指南手动添加');
    }

    /**
     * 创建存档面板
     */
    private setupSaveListPanel(canvas: Node) {
        let panel = canvas.getChildByName('SaveListPanel');
        if (!panel) {
            panel = new Node('SaveListPanel');
            canvas.addChild(panel);
        }

        // 默认隐藏
        panel.active = false;

        // 创建背景遮罩
        let background = panel.getChildByName('Background');
        if (!background) {
            background = new Node('Background');
            panel.addChild(background);

            const transform = background.addComponent(UITransform);
            transform.setContentSize(1280, 720);

            const sprite = background.addComponent(Sprite);
            sprite.color = new Color(0, 0, 0, 180);

            const widget = background.addComponent(Widget);
            widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
            widget.left = widget.right = widget.top = widget.bottom = 0;
        }

        // 创建主面板
        let mainPanel = panel.getChildByName('Panel');
        if (!mainPanel) {
            mainPanel = new Node('Panel');
            panel.addChild(mainPanel);

            const transform = mainPanel.addComponent(UITransform);
            transform.setContentSize(800, 600);

            const sprite = mainPanel.addComponent(Sprite);
            sprite.color = new Color(240, 240, 240);
        }

        // 创建标题
        let title = mainPanel.getChildByName('Title');
        if (!title) {
            title = new Node('Title');
            mainPanel.addChild(title);

            const label = title.addComponent(Label);
            label.string = '💾 存档管理';
            label.fontSize = 32;
            label.color = Color.BLACK;
            
            title.setPosition(0, 250, 0);
        }

        // 创建ScrollView
        let scrollView = mainPanel.getChildByName('ScrollView');
        if (!scrollView) {
            scrollView = this.createScrollView();
            mainPanel.addChild(scrollView);
            scrollView.setPosition(0, 0, 0);
        }

        // 创建空提示
        let emptyTip = mainPanel.getChildByName('EmptyTip');
        if (!emptyTip) {
            emptyTip = new Node('EmptyTip');
            mainPanel.addChild(emptyTip);

            const label = emptyTip.addComponent(Label);
            label.string = '暂无存档\n点击"新建存档"创建';
            label.fontSize = 20;
            label.color = Color.GRAY;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.lineHeight = 30;

            emptyTip.active = false;
        }

        // 创建按钮
        this.createSimpleButton(mainPanel, 'CreateSaveButton', '+ 新建存档', -150, -250);
        this.createSimpleButton(mainPanel, 'CloseButton', '关闭', 150, -250);

        this.log('✅ 存档面板基础结构创建完成');
    }

    /**
     * 创建ScrollView
     */
    private createScrollView(): Node {
        const scrollNode = new Node('ScrollView');
        
        const transform = scrollNode.addComponent(UITransform);
        transform.setContentSize(750, 400);

        const scrollView = scrollNode.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;

        // View节点
        const view = new Node('View');
        scrollNode.addChild(view);
        const viewTransform = view.addComponent(UITransform);
        viewTransform.setContentSize(750, 400);
        view.setPosition(0, 0, 0);

        // Content节点
        const content = new Node('Content');
        view.addChild(content);
        const contentTransform = content.addComponent(UITransform);
        contentTransform.setContentSize(750, 400);
        content.setPosition(0, 0, 0);

        const layout = content.addComponent(Layout);
        layout.type = Layout.Type.VERTICAL;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;
        layout.spacingY = 10;
        layout.paddingTop = 10;
        layout.paddingBottom = 10;

        scrollView.content = content;

        return scrollNode;
    }

    /**
     * 创建简单按钮
     */
    private createSimpleButton(parent: Node, name: string, text: string, x: number, y: number): Node {
        let btn = parent.getChildByName(name);
        if (!btn) {
            btn = new Node(name);
            parent.addChild(btn);

            const transform = btn.addComponent(UITransform);
            transform.setContentSize(150, 50);

            const sprite = btn.addComponent(Sprite);
            sprite.color = new Color(100, 150, 200);

            const button = btn.addComponent(Button);
            button.transition = Button.Transition.COLOR;

            const labelNode = new Node('Label');
            btn.addChild(labelNode);

            const label = labelNode.addComponent(Label);
            label.string = text;
            label.fontSize = 20;
            label.color = Color.WHITE;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
        }

        btn.setPosition(x, y, 0);
        return btn;
    }

    /**
     * 日志输出
     */
    private log(message: string) {
        if (this.enableDebugLog) {
            console.log(`[MainMenuAutoSetup] ${message}`);
        }
    }
}
