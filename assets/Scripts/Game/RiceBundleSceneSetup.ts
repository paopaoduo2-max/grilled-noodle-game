import { _decorator, Component, Node, Label, Sprite, UITransform, Color, Vec3, Button } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 🔥 第二关场景初始化脚本
 *
 * 功能：
 * 1. 清理所有旧的Sprite Frame引用
 * 2. 重建食材按钮布局
 * 3. 优化制作区域显示
 * 4. 完善进度条
 * 5. 添加动态提示系统
 */
@ccclass('RiceBundleSceneSetup')
export class RiceBundleSceneSetup extends Component {

    @property(Node)
    ingredientsPanel: Node = null!;

    @property(Node)
    steamerArea: Node = null!;

    @property(Node)
    mixingBowlArea: Node = null!;

    @property(Node)
    cabbageLeafArea: Node = null!;

    @property(Label)
    instructionLabel: Label = null!;

    // 食材按钮配置
    private readonly ingredientButtons = [
        { name: 'RiceBtn', emoji: '🍚', text: '大米', color: new Color(255, 250, 220, 255) },
        { name: 'PotatoBtn', emoji: '🥔', text: '土豆', color: new Color(230, 200, 150, 255) },
        { name: 'EggBtn', emoji: '🥚', text: '鸡蛋', color: new Color(255, 230, 150, 255) },
        { name: 'GreenOnionBtn', emoji: '🧅', text: '大葱', color: new Color(150, 220, 100, 255) },
        { name: 'LettuceBtn', emoji: '🥬', text: '生菜', color: new Color(150, 255, 150, 255) },
        { name: 'CilantroBtn', emoji: '🌿', text: '香菜', color: new Color(100, 220, 150, 255) },
    ];

    // 区域配置
    private readonly areaConfigs = [
        { node: null as Node | null, emoji: '🔥', text: '蒸锅', color: new Color(255, 200, 150, 255), position: new Vec3(-300, 0, 0) },
        { node: null as Node | null, emoji: '🥣', text: '搅拌盆', color: new Color(200, 220, 255, 255), position: new Vec3(0, 0, 0) },
        { node: null as Node | null, emoji: '🥬', text: '菜叶区', color: new Color(180, 255, 180, 255), position: new Vec3(300, 0, 0) },
    ];

    start() {
        console.log('[RiceBundleSceneSetup] 🔥 开始场景初始化');

        this.setupIngredientButtons();
        this.setupAreas();
        this.setupProgressBars();
        this.setupInstructionSystem();

        console.log('[RiceBundleSceneSetup] ✅ 场景初始化完成');
    }

    /**
     * 🔥 步骤1：清理并重建食材按钮
     */
    private setupIngredientButtons(): void {
        if (!this.ingredientsPanel) {
            console.warn('[RiceBundleSceneSetup] ⚠️ IngredientsPanel未绑定');
            return;
        }

        this.ingredientButtons.forEach((config, index) => {
            const btnNode = this.ingredientsPanel.getChildByName(config.name);
            if (!btnNode) {
                console.warn(`[RiceBundleSceneSetup] ⚠️ 未找到按钮: ${config.name}`);
                return;
            }

            // 设置按钮样式
            this.setupButtonStyle(btnNode, config);

            // 设置按钮位置（横向排列）
            const spacing = 110;
            const startX = -275;
            btnNode.setPosition(startX + index * spacing, -350, 0);

            console.log(`[RiceBundleSceneSetup] ✅ 设置按钮: ${config.emoji} ${config.text}`);
        });
    }

    /**
     * 设置按钮样式
     */
    private setupButtonStyle(btnNode: Node, config: any): void {
        // 设置按钮大小
        const transform = btnNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(100, 90);
        }

        // 更新已有Label
        let labelNode = btnNode.getChildByName('BtnLabel') || btnNode.getChildByName('Label');
        if (!labelNode) {
            console.warn(`[RiceBundleSceneSetup] ?? ${btnNode.name} 缺少按钮文字节点`);
            return;
        }

        labelNode.setPosition(0, 0, 0);
        labelNode.active = true;

        const label = labelNode.getComponent(Label) || labelNode.addComponent(Label);
        if (!label.string || label.string.trim().length === 0) {
            label.string = `${config.emoji}\n${config.text}`;
        }
        label.fontSize = 24;
        label.lineHeight = 30;
        label.color = new Color(255, 255, 255, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        const labelTransform = labelNode.getComponent(UITransform) || labelNode.addComponent(UITransform);
        labelTransform.setContentSize(100, 90);
    }

    /**
     * 🔥 步骤2：优化制作区域
     */
    private setupAreas(): void {
        this.areaConfigs[0].node = this.steamerArea;
        this.areaConfigs[1].node = this.mixingBowlArea;
        this.areaConfigs[2].node = this.cabbageLeafArea;

        this.areaConfigs.forEach((config, index) => {
            if (!config.node) return;

            // 设置区域位置
            config.node.setPosition(config.position);

            // 设置区域大小
            const transform = config.node.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(200, 250);
            }

            // 更新区域标签
            this.updateAreaLabel(config.node, `${config.emoji} ${config.text}`, config.color);

            console.log(`[RiceBundleSceneSetup] ✅ 设置区域: ${config.emoji} ${config.text}`);
        });
    }

    /**
     * 更新区域标签
     */
    private updateAreaLabel(areaNode: Node, text: string, color: Color): void {
        let labelNode = areaNode.getChildByName('AreaLabel');
        if (!labelNode) {
            console.warn(`[RiceBundleSceneSetup] ?? ${areaNode.name} 缺少区域标签节点`);
            return;
        }

        labelNode.setPosition(0, 100, 0);

        const label = labelNode.getComponent(Label) || labelNode.addComponent(Label);
        if (!label.string || label.string.trim().length === 0) {
            label.string = text;
        }
        label.fontSize = 36;
        label.lineHeight = 40;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableOutline = true;
        label.outlineColor = new Color(0, 0, 0, 255);
        label.outlineWidth = 2;

        const transform = labelNode.getComponent(UITransform) || labelNode.addComponent(UITransform);
        transform.setContentSize(180, 50);
    }

    /**
     * 🔥 步骤3：完善进度条
     */
    private setupProgressBars(): void {
        const progressConfigs = [
            { area: this.steamerArea, names: ['PotatoProgress', 'RiceProgress'], color: new Color(100, 220, 100, 255) },
            { area: this.mixingBowlArea, names: ['MixProgress'], color: new Color(100, 220, 100, 255) },
            { area: this.cabbageLeafArea, names: ['RollProgress'], color: new Color(100, 220, 100, 255) },
        ];

        progressConfigs.forEach(config => {
            if (!config.area) return;

            config.names.forEach((name, index) => {
                const progressNode = config.area.getChildByName(name);
                if (!progressNode) return;

                // 设置进度条位置
                const yOffset = -30 - index * 30;
                progressNode.setPosition(-80, yOffset, 0);

                // 设置进度条样式
                const transform = progressNode.getComponent(UITransform);
                if (transform) {
                    transform.setAnchorPoint(0, 0.5);
                    transform.setContentSize(5, 15);
                }

                const sprite = progressNode.getComponent(Sprite);
                if (sprite) {
                    sprite.color = config.color;
                } else {
                    console.warn(`[RiceBundleSceneSetup] ?? ${name} 缺少Sprite组件`);
                }

                // 更新进度标签
                const labelNode = progressNode.getChildByName('ProgressLabel');
                if (labelNode) {
                    labelNode.setPosition(80, 0, 0);
                    const label = labelNode.getComponent(Label);
                    if (label) {
                        label.fontSize = 20;
                        label.color = new Color(255, 255, 255, 255);
                    }
                }

                console.log(`[RiceBundleSceneSetup] ✅ 设置进度条: ${name}`);
            });
        });
    }

    /**
     * 🔥 步骤4：设置提示系统
     */
    private setupInstructionSystem(): void {
        if (!this.instructionLabel) {
            console.warn('[RiceBundleSceneSetup] ⚠️ InstructionLabel未绑定');
            return;
        }

        // 设置提示标签样式
        this.instructionLabel.fontSize = 32;
        this.instructionLabel.lineHeight = 36;
        this.instructionLabel.color = new Color(255, 255, 100, 255);
        this.instructionLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.instructionLabel.enableOutline = true;
        this.instructionLabel.outlineColor = new Color(0, 0, 0, 255);
        this.instructionLabel.outlineWidth = 3;

        // 设置初始提示
        this.instructionLabel.string = '💡 点击 🥔 土豆 或 🍚 大米 开始蒸制';

        console.log('[RiceBundleSceneSetup] ✅ 设置提示系统');
    }
}
