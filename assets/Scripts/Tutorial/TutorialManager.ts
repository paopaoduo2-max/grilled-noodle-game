import { _decorator, Component } from 'cc';
import { GuideManager } from './GuideManager';
const { ccclass } = _decorator;

/**
 * 教程管理器（占位）
 * 旧教程逻辑已移除，等待新教程系统接入。
 */
@ccclass('TutorialManager')
export class TutorialManager extends Component {
    public static instance: TutorialManager | null = null;

    onLoad() {
        TutorialManager.instance = this;
    }

    onDestroy() {
        if (TutorialManager.instance === this) {
            TutorialManager.instance = null;
        }
    }

    public setCookingController(_controller: Component) {
        // no-op
    }

    public isInTutorial(): boolean {
        return GuideManager.instance?.isTutorialActive() ?? false;
    }

    public shouldStartTutorial(): boolean {
        return GuideManager.instance?.shouldStartTutorial() ?? false;
    }

    public triggerAction(_action: string, _data?: any) {
        GuideManager.instance?.onCookingAction(_action, _data);
    }

    public showNPCDialogue(_key: string) {
        // 交由 GuideManager 统一显示
    }

    public canRoll(): boolean {
        return true;
    }

    public skipTutorialForTest() {
        GuideManager.instance?.skipTutorial();
    }
}
