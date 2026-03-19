import { sys } from 'cc';
import { DEBUG, EDITOR } from 'cc/env';

export enum LogLevel {
    None = 0,
    Error = 1,
    Warn = 2,
    Log = 3,
    Debug = 4
}

/**
 * 统一控制全局日志输出，避免大量 console.log 影响编辑器流畅度
 */
export class LogManager {
    private static _initialized = false;
    private static _level: LogLevel = LogLevel.Warn;
    private static _orig = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };

    public static init(): void {
        if (this._initialized) return;
        this._initialized = true;
        this.patchConsole();
        this.applyDefaultLevel();
    }

    public static setLevel(level: LogLevel): void {
        this._level = level;
    }

    public static setLevelName(name: string, persist: boolean = true): void {
        const level = this.parseLevel(name);
        this.setLevel(level);
        if (persist) {
            sys.localStorage.setItem('log_level', name.toLowerCase());
        }
    }

    public static getLevel(): LogLevel {
        return this._level;
    }

    private static applyDefaultLevel(): void {
        const saved = sys.localStorage.getItem('log_level');
        if (saved) {
            this.setLevel(this.parseLevel(saved));
            return;
        }
        if (EDITOR) {
            this._level = LogLevel.Warn;
            return;
        }
        if (DEBUG) {
            this._level = LogLevel.Log;
            return;
        }
        this._level = LogLevel.Error;
    }

    private static parseLevel(name: string): LogLevel {
        const key = (name || '').toLowerCase();
        switch (key) {
            case 'none':
            case 'off':
            case '0':
                return LogLevel.None;
            case 'error':
            case 'err':
            case '1':
                return LogLevel.Error;
            case 'warn':
            case 'warning':
            case '2':
                return LogLevel.Warn;
            case 'log':
            case 'info':
            case '3':
                return LogLevel.Log;
            case 'debug':
            case '4':
                return LogLevel.Debug;
            default:
                return LogLevel.Warn;
        }
    }

    private static patchConsole(): void {
        console.log = (...args: any[]) => {
            if (this._level >= LogLevel.Log) this._orig.log(...args);
        };
        console.info = (...args: any[]) => {
            if (this._level >= LogLevel.Log) this._orig.info(...args);
        };
        console.debug = (...args: any[]) => {
            if (this._level >= LogLevel.Debug) this._orig.debug(...args);
        };
        console.warn = (...args: any[]) => {
            if (this._level >= LogLevel.Warn) this._orig.warn(...args);
        };
        console.error = (...args: any[]) => {
            if (this._level >= LogLevel.Error) this._orig.error(...args);
        };
    }
}
