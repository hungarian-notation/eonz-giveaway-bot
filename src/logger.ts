

export interface LoggerInterface {
    log(...data: any[]):        void;
    error(...data: any[]):      void;
}

export enum LogLevel {
    NONE, ERROR, INFO, VERBOSE
}

export class Logger {

    provider: LoggerInterface;
    level: LogLevel;

    constructor(provider: LoggerInterface, level: LogLevel = LogLevel.INFO) {
        this.provider = provider;
        this.level = level
    }

    error(...data: any[]): void {
        if (this.level >= LogLevel.ERROR) {
            this.provider.error(...data);
        }
    }

    log(...data: any[]): void {
        if (this.level >= LogLevel.INFO) {
            this.provider.log(...data);
        }
    }

    verbose(...data: any[]): void {
        if (this.level >= LogLevel.VERBOSE) {
            this.provider.log(...data);
        }
    }

}

export const logger = new Logger(console, LogLevel.INFO);