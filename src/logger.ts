

export interface LoggerInterface {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(...data: any[]):        void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    error(...data: unknown[]): void {
        if (this.level >= LogLevel.ERROR) {
            this.provider.error(...data);
        }
    }

    log(...data: unknown[]): void {
        if (this.level >= LogLevel.INFO) {
            this.provider.log(...data);
        }
    }

    verbose(...data: unknown[]): void {
        if (this.level >= LogLevel.VERBOSE) {
            this.provider.log(...data);
        }
    }

}

export const logger = new Logger(console, LogLevel.INFO);