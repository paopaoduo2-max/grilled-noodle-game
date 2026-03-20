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

    public static recordCompletedOrder(payload: OrderRecordPayload): string[] {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const dayState = manager.progress.currentDayState;
        const completedTaskIds: string[] = [];
        const mainCompleted = this.tryProgressTask(dayState.mainTaskId, payload);
        const sideCompleted = this.tryProgressTask(dayState.sideTaskId, payload);

        if (mainCompleted) {
            completedTaskIds.push(mainCompleted);
        }
        if (sideCompleted && sideCompleted !== mainCompleted) {
            completedTaskIds.push(sideCompleted);
        }

        return completedTaskIds;
    }

    public static getTaskProgress(taskId: string): number {
        if (!taskId) return 0;
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        return manager.getDailyTaskProgress(taskId);
    }

    private static tryProgressTask(taskId: string | null, payload: OrderRecordPayload): string | null {
        if (!taskId) return null;
        const manager = WorldProgressManager.instance;
        if (!manager) return null;

        const task = getWorldStoryTask(taskId);
        if (!task) return null;
        if (task.triggerWindow.mapId && task.triggerWindow.mapId !== payload.mapId) return null;
        if (task.orderRequirements.flavorTags?.length) {
            const flavorTags = payload.flavorTags || [];
            const matched = task.orderRequirements.flavorTags.some((tag) => flavorTags.includes(tag));
            if (!matched) return null;
        }

        const progress = manager.increaseDailyTaskProgress(taskId, 1);
        if (progress >= task.orderRequirements.orderCount) {
            manager.completeStoryTask(taskId);
            return taskId;
        }

        return null;
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
