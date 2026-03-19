import { _decorator, Component } from 'cc';
import { InventoryManager } from '../Manager/InventoryManager';
import { WorldProgressManager } from '../Manager/WorldProgressManager';
import { WorldStoryTaskManager } from '../Manager/WorldStoryTaskManager';

const { ccclass } = _decorator;

@ccclass('WorldEarningBridge')
export class WorldEarningBridge extends Component {
    private startWallet = 0;
    private committed = false;

    onLoad() {
        WorldProgressManager.ensureInstance();
        WorldStoryTaskManager.bootstrapDailyTasks();
        this.startWallet = InventoryManager.instance?.globalWallet || 0;
        this.committed = false;
    }

    onDestroy() {
        this.commitDelta();
    }

    private commitDelta() {
        if (this.committed) return;
        this.committed = true;

        const manager = WorldProgressManager.instance;
        if (!manager) return;

        const endWallet = InventoryManager.instance?.globalWallet || this.startWallet;
        const delta = endWallet - this.startWallet;
        if (delta > 0) {
            manager.addMoney(delta);
        }
        manager.nextDay();
    }
}
