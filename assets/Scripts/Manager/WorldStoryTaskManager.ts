import { StoryTaskConfig, StoryLineType, WORLD_STORY_TASKS, getWorldStoryTask } from '../Data/WorldRuntimeConfig';
import { WorldProgressManager } from './WorldProgressManager';

interface OrderRecordPayload {
    mapId: string;
    flavorTags?: string[];
}

export class WorldStoryTaskManager {
    /**
     * 每日刷新：最多分配主线1条+支线1条
     */
    public static bootstrapDailyTasks(): void {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const progress = manager.progress;
        const state = progress.currentDayState;
        if (
            state.dayIndex === progress.dayIndex &&
            (state.mainTaskId !== null || state.sideTaskId !== null || Object.keys(state.taskProgress).length > 0)
        ) {
            return;
        }

        manager.resetCurrentDayState();
        manager.assignDailyTask('main', this.pickTask('main'));
        manager.assignDailyTask('side', this.pickTask('side'));
    }

    public static getTodayMainTask(): StoryTaskConfig | null {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        return this.resolveTodayTask(manager.progress.currentDayState.mainTaskId);
    }

    public static getTodaySideTask(): StoryTaskConfig | null {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        return this.resolveTodayTask(manager.progress.currentDayState.sideTaskId);
    }

    public static recordCompletedOrder(payload: OrderRecordPayload): void {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const dayState = manager.progress.currentDayState;
        this.tryProgressTask(dayState.mainTaskId, payload);
        this.tryProgressTask(dayState.sideTaskId, payload);
    }

    private static tryProgressTask(taskId: string | null, payload: OrderRecordPayload): void {
        if (!taskId) return;
        const manager = WorldProgressManager.instance;
        if (!manager) return;

        const task = getWorldStoryTask(taskId);
        if (!task) return;
        if (task.triggerWindow.mapId && task.triggerWindow.mapId !== payload.mapId) return;
        if (task.orderRequirements.flavorTags?.length) {
            const flavorTags = payload.flavorTags || [];
            const matched = task.orderRequirements.flavorTags.some((tag) => flavorTags.includes(tag));
            if (!matched) return;
        }

        const progress = manager.increaseDailyTaskProgress(taskId, 1);
        if (progress >= task.orderRequirements.orderCount) {
            manager.completeStoryTask(taskId);
        }
    }

    private static resolveTodayTask(taskId: string | null): StoryTaskConfig | null {
        if (!taskId) return null;
        return getWorldStoryTask(taskId);
    }

    private static pickTask(lineType: StoryLineType): string | null {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const progress = manager.progress;
        const candidates = WORLD_STORY_TASKS.filter((task) => {
            if (task.lineType !== lineType) return false;
            if (manager.isStoryTaskCompleted(task.taskId)) return false;
            if (task.triggerWindow.mapId && task.triggerWindow.mapId !== progress.currentMapId) return false;
            if (task.triggerWindow.dayFrom && progress.dayIndex < task.triggerWindow.dayFrom) return false;
            if (task.triggerWindow.dayTo && progress.dayIndex > task.triggerWindow.dayTo) return false;
            return true;
        });

        return candidates.length > 0 ? candidates[0].taskId : null;
    }
}
