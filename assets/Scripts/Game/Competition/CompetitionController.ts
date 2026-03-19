import { _decorator, Component, Node, Label, Button, UITransform, Color, find } from 'cc';

const { ccclass } = _decorator;

type IngredientEntry = {
    id: string;
    name: string;
    used: boolean;
    node: Node;
    label: Label;
};

@ccclass('CompetitionController')
export class CompetitionController extends Component {
    private competitionRoot: Node | null = null;
    private dishSelectPanel: Node | null = null;
    private ingredientSelectPanel: Node | null = null;
    private ingredientList: Node | null = null;
    private selectedList: Node | null = null;
    private submitPanel: Node | null = null;
    private puzzleLabel: Label | null = null;
    private stageLabel: Label | null = null;
    private playerScoreLabel: Label | null = null;
    private aiScoreLabels: Label[] = [];

    private grilledDishButton: Button | null = null;
    private otherDishNodes: Node[] = [];
    private submitButton: Node | null = null;
    private serveButton: Node | null = null;

    private cookingController: Component | null = null;
    private cookingNodes: Node[] = [];

    private selectedDishId: string | null = null;
    private selectedIngredients: IngredientEntry[] = [];
    private cookedOnce = false;
    private cookingStarted = false;

    private readonly grilledIngredients = [
        { id: 'dough', name: '面饼' },
        { id: 'egg', name: '鸡蛋' },
        { id: 'sausage', name: '香肠' },
        { id: 'onion', name: '洋葱' },
        { id: 'cilantro', name: '香菜' },
    ];

    onLoad() {
        this.resolveNodes();
        this.bindButtons();
        this.setInitialState();
    }

    private resolveNodes() {
        const canvas = this.node;
        this.competitionRoot = find('CompetitionRoot', canvas);
        this.dishSelectPanel = find('CompetitionRoot/DishSelectPanel', canvas);
        this.ingredientSelectPanel = find('CompetitionRoot/IngredientSelectPanel', canvas);
        this.ingredientList = find('CompetitionRoot/IngredientSelectPanel/IngredientList', canvas);
        this.selectedList = find('CompetitionRoot/IngredientSelectPanel/SelectedList', canvas);
        this.submitPanel = find('CompetitionRoot/SubmitPanel', canvas);

        const puzzleNode = find('CompetitionRoot/JudgePanel/PuzzleText', canvas);
        this.puzzleLabel = puzzleNode ? puzzleNode.getComponent(Label) : null;
        const stageNode = find('CompetitionRoot/StagePanel/StageLabel', canvas);
        this.stageLabel = stageNode ? stageNode.getComponent(Label) : null;

        const playerScoreNode = find('CompetitionRoot/ScoreboardPanel/PlayerScore', canvas);
        this.playerScoreLabel = playerScoreNode ? playerScoreNode.getComponent(Label) : null;
        const aiNodes = ['AIScore1', 'AIScore2', 'AIScore3'].map(name => find(`CompetitionRoot/ScoreboardPanel/${name}`, canvas));
        this.aiScoreLabels = aiNodes.map(node => (node ? node.getComponent(Label) : null)).filter(label => label) as Label[];

        const dishNode = find('CompetitionRoot/DishSelectPanel/DishList/DishItem_GrilledNoodle', canvas);
        this.grilledDishButton = dishNode ? dishNode.getComponent(Button) : null;

        this.otherDishNodes = [
            find('CompetitionRoot/DishSelectPanel/DishList/DishItem_RiceBundle', canvas),
            find('CompetitionRoot/DishSelectPanel/DishList/DishItem_GuoBaoRou', canvas),
            find('CompetitionRoot/DishSelectPanel/DishList/DishItem_MalaTang', canvas),
            find('CompetitionRoot/DishSelectPanel/DishList/DishItem_BBQ', canvas),
        ].filter(node => node) as Node[];

        this.submitButton = find('CompetitionRoot/SubmitPanel/SubmitButton', canvas);
        this.serveButton = find('ServeButton', canvas);

        this.cookingController = canvas.getComponent('CookingControllerV2');
        this.cookingNodes = [
            find('GrillArea', canvas),
            find('IngredientsPanel', canvas),
            find('SpatulaBtn', canvas),
            find('OilBtn', canvas),
            find('WaterBtn', canvas),
            find('SausageContainer', canvas),
            find('BrushSauceSystem', canvas),
            find('Brush', canvas),
            find('PackingBox1', canvas),
            find('PackingBox2', canvas),
            find('PackingBox3', canvas),
            find('HandItem', canvas),
            find('MouseFollower', canvas),
        ].filter(node => node) as Node[];
    }

    private bindButtons() {
        if (this.grilledDishButton) {
            this.grilledDishButton.node.on(Button.EventType.CLICK, this.onSelectGrilledNoodle, this);
        }
        for (const node of this.otherDishNodes) {
            const button = node.getComponent(Button);
            if (button) {
                button.interactable = false;
            }
            const nameLabel = node.getChildByName('Name')?.getComponent(Label);
            if (nameLabel) {
                nameLabel.string = `${nameLabel.string}(未开放)`;
            }
        }
        if (this.submitButton) {
            this.submitButton.on(Button.EventType.CLICK, this.onSubmit, this);
        }
        if (this.serveButton) {
            this.serveButton.on(Node.EventType.TOUCH_END, this.onServe, this);
        }
    }

    private setInitialState() {
        this.setStageText('请选择菜品解题');
        if (this.ingredientSelectPanel) this.ingredientSelectPanel.active = false;
        if (this.submitPanel) this.submitPanel.active = false;
        this.setCookingVisible(false);
        this.setCookingEnabled(false);
    }

    private onSelectGrilledNoodle() {
        this.selectedDishId = 'grilled_cold_noodle';
        this.setStageText('已选择烤冷面，请选择食材');
        if (this.ingredientSelectPanel) this.ingredientSelectPanel.active = true;
        if (this.submitPanel) this.submitPanel.active = true;
        this.buildIngredientOptions(this.grilledIngredients);
        this.clearSelectedList();
        this.cookedOnce = false;
        this.cookingStarted = false;
        this.setSubmitLabel('开始制作');
        this.setIngredientSelectionEnabled(true);
    }

    private buildIngredientOptions(options: { id: string; name: string }[]) {
        if (!this.ingredientList) return;
        this.ingredientList.removeAllChildren();
        for (const option of options) {
            const item = new Node(`Ingredient_${option.id}`);
            item.addComponent(UITransform).setContentSize(180, 28);
            const button = item.addComponent(Button);
            const labelNode = new Node('Label');
            labelNode.addComponent(UITransform);
            const label = labelNode.addComponent(Label);
            label.string = option.name;
            label.fontSize = 16;
            labelNode.setParent(item);
            item.setParent(this.ingredientList);
            item.on(Button.EventType.CLICK, () => this.addSelectedIngredient(option.id, option.name), this);
            button.transition = Button.Transition.NONE;
        }
        this.layoutVertical(this.ingredientList, 26);
    }

    private addSelectedIngredient(id: string, name: string) {
        if (!this.selectedList) return;
        if (this.selectedIngredients.some(item => item.id === id)) return;
        const entryNode = new Node(`Selected_${id}`);
        entryNode.addComponent(UITransform).setContentSize(180, 26);
        const button = entryNode.addComponent(Button);
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform);
        const label = labelNode.addComponent(Label);
        label.string = `□ ${name}`;
        label.fontSize = 16;
        labelNode.setParent(entryNode);
        entryNode.setParent(this.selectedList);
        const entry: IngredientEntry = { id, name, used: false, node: entryNode, label };
        this.selectedIngredients.push(entry);
        entryNode.on(Button.EventType.CLICK, () => this.toggleUsed(entry), this);
        button.transition = Button.Transition.NONE;
        this.layoutVertical(this.selectedList, 24);
    }

    private toggleUsed(entry: IngredientEntry) {
        entry.used = !entry.used;
        entry.label.string = `${entry.used ? '✓' : '□'} ${entry.name}`;
        entry.label.color = entry.used ? new Color(80, 200, 120) : Color.WHITE;
    }

    private onServe() {
        if (!this.selectedDishId) return;
        this.cookedOnce = true;
        this.setStageText('制作完成，可提交给评委');
    }

    private onSubmit() {
        if (!this.selectedDishId) {
            this.setStageText('请先选择菜品');
            return;
        }
        if (!this.cookingStarted) {
            if (this.selectedIngredients.length === 0) {
                this.setStageText('请先选择食材');
                return;
            }
            this.startCooking();
            return;
        }
        if (!this.cookedOnce) {
            this.setStageText('请先完成制作');
            return;
        }
        const unusedCount = this.selectedIngredients.filter(item => !item.used).length;
        const baseScore = 100;
        const penalty = unusedCount * 5;
        const finalScore = Math.max(0, baseScore - penalty);
        if (this.playerScoreLabel) {
            this.playerScoreLabel.string = `你：${finalScore}分`;
        }
        this.updateAIScores(finalScore);
        this.setStageText(unusedCount > 0 ? `未用完食材-${penalty}分` : '全部用完，加分稳定');
    }

    private updateAIScores(playerScore: number) {
        const base = Math.max(60, playerScore - 10);
        this.aiScoreLabels.forEach((label, index) => {
            const jitter = Math.floor(Math.random() * 15);
            const score = base + jitter + index * 3;
            label.string = `对手${String.fromCharCode(65 + index)}：${score}分`;
        });
    }

    private clearSelectedList() {
        if (this.selectedList) {
            this.selectedList.removeAllChildren();
        }
        this.selectedIngredients = [];
    }

    private startCooking() {
        this.cookingStarted = true;
        this.setStageText('开始制作');
        this.setCookingVisible(true);
        this.setCookingEnabled(true);
        const controller = this.cookingController as any;
        if (controller && typeof controller.setBusinessState === 'function') {
            controller.setBusinessState(true);
        }
        if (this.dishSelectPanel) this.dishSelectPanel.active = false;
        this.setIngredientSelectionEnabled(false);
        this.setSubmitLabel('提交给评委');
    }

    private setStageText(text: string) {
        if (this.stageLabel) {
            this.stageLabel.string = text;
        }
    }

    private setSubmitLabel(text: string) {
        const label = this.submitButton?.getChildByName('Label')?.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }

    private setIngredientSelectionEnabled(enabled: boolean) {
        if (this.ingredientSelectPanel) this.ingredientSelectPanel.active = true;
        if (this.ingredientList) this.ingredientList.active = enabled;
        if (this.selectedList) this.selectedList.active = true;
    }

    private setCookingVisible(visible: boolean) {
        for (const node of this.cookingNodes) {
            node.active = visible;
        }
    }

    private setCookingEnabled(enabled: boolean) {
        if (this.cookingController) {
            (this.cookingController as any).enabled = enabled;
        }
    }

    private layoutVertical(container: Node, gap: number) {
        const children = container.children;
        let y = (children.length - 1) * gap * 0.5;
        for (const child of children) {
            child.setPosition(0, y, 0);
            y -= gap;
        }
    }
}
