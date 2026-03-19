import { _decorator, Component, Node, Label, Button, ScrollView, Prefab, instantiate, Color, Sprite, UITransform, EditBox } from 'cc';
import { SaveManager, SaveData } from '../Manager/SaveManager';
import { SceneRouteService } from '../Manager/SceneRouteService';
const { ccclass, property } = _decorator;

/**
 * 存档列表UI控制器
 */
@ccclass('SaveListUI')
export class SaveListUI extends Component {
    @property(ScrollView)
    scrollView: ScrollView = null;
    
    @property(Node)
    contentNode: Node = null;
    
    @property(Prefab)
    saveItemPrefab: Prefab = null;
    
    @property(Button)
    closeBtn: Button = null;
    
    @property(Button)
    createSaveBtn: Button = null;
    
    @property(Label)
    emptyTipLabel: Label = null;

    private dialogLayer: Node = null;

    onLoad() {
        this.setupButtons();
    }

    onEnable() {
        this.refreshSaveList();
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.closeBtn) {
            this.closeBtn.node.on(Button.EventType.CLICK, this.onClose, this);
        }
        
        if (this.createSaveBtn) {
            this.createSaveBtn.node.on(Button.EventType.CLICK, this.onCreateSave, this);
        }
    }

    /**
     * 刷新存档列表
     */
    public refreshSaveList() {
        if (!this.contentNode) {
            console.error('[SaveListUI] contentNode未设置');
            return;
        }
        
        // 清空旧列表
        this.contentNode.removeAllChildren();
        
        // 获取所有存档
        const saves = SaveManager.listSaves();
        
        if (saves.length === 0) {
            // 显示空提示
            if (this.emptyTipLabel) {
                this.emptyTipLabel.node.active = true;
                this.emptyTipLabel.string = '暂无存档\n点击"新建存档"创建';
            }
            return;
        }
        
        if (this.emptyTipLabel) {
            this.emptyTipLabel.node.active = false;
        }
        
        // 创建存档项
        saves.forEach(save => {
            const saveItem = this.createSaveItem(save);
            this.contentNode.addChild(saveItem);
        });
        
        console.log(`[SaveListUI] 已加载${saves.length}个存档`);
    }

    /**
     * 创建存档列表项
     */
    private createSaveItem(save: SaveData): Node {
        let itemNode: Node;
        
        // 如果有预制体，使用预制体
        if (this.saveItemPrefab) {
            itemNode = instantiate(this.saveItemPrefab);
        } else {
            // 否则动态创建
            itemNode = this.createSaveItemDynamic(save);
        }
        
        // 设置数据
        this.setupSaveItemData(itemNode, save);
        
        return itemNode;
    }

    /**
     * 动态创建存档项（如果没有预制体）
     */
    private createSaveItemDynamic(save: SaveData): Node {
        const itemNode = new Node('SaveItem_' + save.saveId);
        const transform = itemNode.addComponent(UITransform);
        transform.setContentSize(700, 120);
        
        // 背景
        const bgSprite = itemNode.addComponent(Sprite);
        bgSprite.color = save.saveType === 'auto' 
            ? new Color(220, 220, 255, 255) 
            : new Color(220, 255, 220, 255);
        
        // 类型图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = save.saveType === 'auto' ? '🔄' : '💾';
        iconLabel.fontSize = 32;
        iconNode.setPosition(-300, 0, 0);
        itemNode.addChild(iconNode);
        
        // 存档名称
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = save.saveName;
        nameLabel.fontSize = 20;
        nameLabel.color = Color.BLACK;
        nameNode.setPosition(-200, 30, 0);
        itemNode.addChild(nameNode);
        
        // 存档信息
        const infoNode = new Node('Info');
        const infoLabel = infoNode.addComponent(Label);
        const date = new Date(save.timestamp);
        const timeStr = date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        infoLabel.string = `💰 ${save.playerData.totalMoney}金币 | 关卡${save.playerData.currentLevel} | ${timeStr}`;
        infoLabel.fontSize = 16;
        infoLabel.color = new Color(60, 60, 60, 255);
        infoNode.setPosition(-200, 0, 0);
        itemNode.addChild(infoNode);
        
        // 统计信息
        const statsNode = new Node('Stats');
        const statsLabel = statsNode.addComponent(Label);
        const totalReviews = save.stats.superGoodReviews + save.stats.goodReviews + save.stats.badReviews;
        statsLabel.string = `📊 订单:${save.stats.totalOrders} | 好评:${save.stats.superGoodReviews + save.stats.goodReviews}/${totalReviews}`;
        statsLabel.fontSize = 14;
        statsLabel.color = new Color(100, 100, 100, 255);
        statsNode.setPosition(-200, -25, 0);
        itemNode.addChild(statsNode);
        
        // 加载按钮
        const loadBtnNode = this.createButton('加载', new Color(100, 200, 100, 255));
        loadBtnNode.setPosition(200, 20, 0);
        itemNode.addChild(loadBtnNode);
        
        // 删除按钮
        const deleteBtnNode = this.createButton('删除', new Color(255, 100, 100, 255));
        deleteBtnNode.setPosition(200, -30, 0);
        itemNode.addChild(deleteBtnNode);
        
        return itemNode;
    }

    /**
     * 创建按钮
     */
    private createButton(text: string, color: Color): Node {
        const btnNode = new Node('Btn_' + text);
        const btnTransform = btnNode.addComponent(UITransform);
        btnTransform.setContentSize(120, 40);
        
        const btnSprite = btnNode.addComponent(Sprite);
        btnSprite.color = color;
        
        const btn = btnNode.addComponent(Button);
        
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 18;
        label.color = Color.WHITE;
        btnNode.addChild(labelNode);
        
        return btnNode;
    }

    /**
     * 设置存档项数据和事件
     */
    private setupSaveItemData(itemNode: Node, save: SaveData) {
        // 查找加载按钮
        const loadBtn = itemNode.getChildByName('Btn_加载')?.getComponent(Button);
        if (loadBtn) {
            loadBtn.node.on(Button.EventType.CLICK, () => {
                this.onLoadSave(save);
            }, this);
        }
        
        // 查找删除按钮
        const deleteBtn = itemNode.getChildByName('Btn_删除')?.getComponent(Button);
        if (deleteBtn) {
            deleteBtn.node.on(Button.EventType.CLICK, () => {
                this.onDeleteSave(save);
            }, this);
        }
        
        // 更新Label内容（如果使用预制体）
        const nameLabel = itemNode.getChildByName('Name')?.getComponent(Label);
        if (nameLabel) {
            nameLabel.string = save.saveName;
        }
        
        const infoLabel = itemNode.getChildByName('Info')?.getComponent(Label);
        if (infoLabel) {
            const date = new Date(save.timestamp);
            const timeStr = date.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            infoLabel.string = `💰 ${save.playerData.totalMoney}金币 | 关卡${save.playerData.currentLevel} | ${timeStr}`;
        }
    }

    /**
     * 加载存档
     */
    private onLoadSave(save: SaveData) {
        console.log('[SaveListUI] 加载存档:', save.saveName);

        if (save.snapshot) {
            SaveManager.applySnapshot(save.snapshot);
        }

        this.onClose();
        SceneRouteService.goShop();
    }

    /**
     * 删除存档
     */
    private onDeleteSave(save: SaveData) {
        console.log('[SaveListUI] 删除存档:', save.saveName);
        this.showConfirmDialog(`确定要删除存档“${save.saveName}”吗？`, () => {
            SaveManager.deleteSave(save.saveId);
            this.refreshSaveList();
        });
    }

    /**
     * 创建新存档
     */
    private onCreateSave() {
        const defaultName = `我的存档${Date.now()}`;
        this.showInputDialog('新建存档', defaultName, (name) => {
            if (!name) return;
            const gameData = SaveManager.buildCurrentSaveData();
            try {
                SaveManager.createSave(name, 'manual', gameData);
                this.refreshSaveList();
                console.log('[SaveListUI] 存档创建成功');
            } catch (e) {
                console.error('[SaveListUI] 创建存档失败:', e);
            }
        });
    }

    /**
     * 关闭面板
     */
    private onClose() {
        this.node.active = false;
    }

    private ensureDialogLayer(): Node {
        if (this.dialogLayer && this.dialogLayer.isValid) {
            this.dialogLayer.removeAllChildren();
            this.dialogLayer.active = true;
            this.setupDialogLayerBackground(this.dialogLayer);
            return this.dialogLayer;
        }

        const layer = new Node('DialogLayer');
        const parentTransform = this.node.getComponent(UITransform);
        const width = parentTransform ? parentTransform.width : 1280;
        const height = parentTransform ? parentTransform.height : 720;
        const layerTransform = layer.addComponent(UITransform);
        layerTransform.setContentSize(width, height);
        layer.setPosition(0, 0, 0);

        this.setupDialogLayerBackground(layer);
        this.node.addChild(layer);
        layer.setSiblingIndex(9999);
        this.dialogLayer = layer;
        return layer;
    }

    private setupDialogLayerBackground(layer: Node) {
        const sprite = layer.getComponent(Sprite) || layer.addComponent(Sprite);
        sprite.color = new Color(0, 0, 0, 120);
        if (!layer.getComponent(Button)) {
            layer.addComponent(Button);
        }
    }

    private showConfirmDialog(message: string, onConfirm: () => void) {
        const layer = this.ensureDialogLayer();
        const panel = this.createDialogPanel(360, 200, '确认');
        panel.setPosition(0, 0, 0);
        layer.addChild(panel);

        const messageNode = new Node('Message');
        messageNode.addComponent(UITransform).setContentSize(300, 80);
        const messageLabel = messageNode.addComponent(Label);
        messageLabel.string = message;
        messageLabel.fontSize = 16;
        messageLabel.color = new Color(50, 50, 50, 255);
        messageLabel.lineHeight = 22;
        messageLabel.horizontalAlign = 1;
        messageLabel.verticalAlign = 1;
        messageNode.setPosition(0, 20, 0);
        panel.addChild(messageNode);

        const cancelBtn = this.createDialogButton('取消', new Color(149, 165, 166, 255));
        cancelBtn.setPosition(-70, -60, 0);
        cancelBtn.on(Button.EventType.CLICK, () => {
            layer.active = false;
        });
        panel.addChild(cancelBtn);

        const confirmBtn = this.createDialogButton('确定', new Color(46, 204, 113, 255));
        confirmBtn.setPosition(70, -60, 0);
        confirmBtn.on(Button.EventType.CLICK, () => {
            layer.active = false;
            onConfirm();
        });
        panel.addChild(confirmBtn);
    }

    private showInputDialog(title: string, defaultValue: string, onConfirm: (value: string) => void) {
        const layer = this.ensureDialogLayer();
        const panel = this.createDialogPanel(420, 240, title);
        panel.setPosition(0, 0, 0);
        layer.addChild(panel);

        const inputNode = new Node('Input');
        inputNode.addComponent(UITransform).setContentSize(280, 40);
        const inputBg = inputNode.addComponent(Sprite);
        inputBg.color = new Color(245, 245, 245, 255);
        inputNode.setPosition(0, 10, 0);
        panel.addChild(inputNode);

        const textNode = new Node('Text');
        textNode.addComponent(UITransform).setContentSize(260, 32);
        const textLabel = textNode.addComponent(Label);
        textLabel.fontSize = 16;
        textLabel.color = new Color(30, 30, 30, 255);
        textLabel.horizontalAlign = 0;
        textLabel.verticalAlign = 1;
        textNode.setPosition(-120, 0, 0);
        inputNode.addChild(textNode);

        const placeholderNode = new Node('Placeholder');
        placeholderNode.addComponent(UITransform).setContentSize(260, 32);
        const placeholderLabel = placeholderNode.addComponent(Label);
        placeholderLabel.string = '请输入存档名称';
        placeholderLabel.fontSize = 16;
        placeholderLabel.color = new Color(160, 160, 160, 255);
        placeholderLabel.horizontalAlign = 0;
        placeholderLabel.verticalAlign = 1;
        placeholderNode.setPosition(-120, 0, 0);
        inputNode.addChild(placeholderNode);

        const editBox = inputNode.addComponent(EditBox);
        editBox.textLabel = textLabel;
        editBox.placeholderLabel = placeholderLabel;
        editBox.string = defaultValue || '';
        editBox.maxLength = 20;

        const cancelBtn = this.createDialogButton('取消', new Color(149, 165, 166, 255));
        cancelBtn.setPosition(-90, -70, 0);
        cancelBtn.on(Button.EventType.CLICK, () => {
            layer.active = false;
        });
        panel.addChild(cancelBtn);

        const confirmBtn = this.createDialogButton('确定', new Color(52, 152, 219, 255));
        confirmBtn.setPosition(90, -70, 0);
        confirmBtn.on(Button.EventType.CLICK, () => {
            const value = editBox.string.trim();
            layer.active = false;
            onConfirm(value);
        });
        panel.addChild(confirmBtn);
    }

    private createDialogPanel(width: number, height: number, title: string): Node {
        const panel = new Node('DialogPanel');
        panel.addComponent(UITransform).setContentSize(width, height);
        const bg = panel.addComponent(Sprite);
        bg.color = new Color(255, 255, 255, 255);

        const titleNode = new Node('Title');
        titleNode.addComponent(UITransform).setContentSize(width - 40, 30);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(30, 30, 30, 255);
        titleLabel.horizontalAlign = 1;
        titleLabel.verticalAlign = 1;
        titleNode.setPosition(0, height / 2 - 30, 0);
        panel.addChild(titleNode);

        return panel;
    }

    private createDialogButton(text: string, color: Color): Node {
        const btn = new Node('DialogButton');
        btn.addComponent(UITransform).setContentSize(120, 40);
        const sprite = btn.addComponent(Sprite);
        sprite.color = color;
        btn.addComponent(Button);

        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform).setContentSize(120, 40);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 16;
        label.color = Color.WHITE;
        label.horizontalAlign = 1;
        label.verticalAlign = 1;
        btn.addChild(labelNode);

        return btn;
    }
}
