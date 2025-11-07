'use client';

type LogEntry = { message: string; timestamp: number };

class DebugLogger {
    private logs: LogEntry[] = [];
    private maxLogs = 50;
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private pendingLogs: string[] = [];
    private updateTimeout: NodeJS.Timeout | null = null;
    private isNotifying = false;

    constructor() {
        if (typeof window !== 'undefined') {
            const originalLog = console.log;
            console.log = (...args: any[]) => {
                const message = args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ');

                this.queueLog(message);
                originalLog(...args);
            };
        }
    }

    private queueLog(message: string) {
        this.pendingLogs.push(message);
        this.scheduleUpdate();
    }

    private scheduleUpdate() {
        // Clear existing timeout to debounce
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        // Batch updates - only notify listeners after a small delay
        this.updateTimeout = setTimeout(() => {
            this.processQueue();
        }, 50); // Wait 50ms to batch multiple logs
    }

    private processQueue() {
        if (this.isNotifying || this.pendingLogs.length === 0) {
            return;
        }

        this.isNotifying = true;

        // Add all pending logs to history
        this.pendingLogs.forEach(message => {
            this.logs = [{ message, timestamp: Date.now() }, ...this.logs].slice(0, this.maxLogs);
        });

        this.pendingLogs = [];

        // Notify listeners once with all new logs
        try {
            this.notifyListeners();
        } finally {
            this.isNotifying = false;
        }
    }

    getLogs(): LogEntry[] {
        return this.logs;
    }

    subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.push(listener);

        // Immediately send current logs
        listener(this.logs);

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.logs);
            } catch (error) {
                console.error('Error in debug logger listener:', error);
            }
        });
    }
}

export const debugLogger = new DebugLogger();
