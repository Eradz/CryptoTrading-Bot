import fs from 'fs';
import path from 'path';

// Create logger
const createLogger = (logDir = 'logs') => {
    // Initialize log directory and files
    const ensureLogDirectory = () => {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    };

    const getLogPaths = () => {
        const date = new Date().toISOString().split('T')[0];
        return {
            tradeLogPath: path.join(logDir, `trades_${date}.log`),
            errorLogPath: path.join(logDir, `errors_${date}.log`)
        };
    };

    ensureLogDirectory();
    const { tradeLogPath, errorLogPath } = getLogPaths();

    const logTrade = (tradeData) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...tradeData
        };

        fs.appendFileSync(
            tradeLogPath,
            JSON.stringify(logEntry) + '\n'
        );
    };

    const logError = (error, context = {}) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            error: error.message,
            stack: error.stack,
            context
        };

        fs.appendFileSync(
            errorLogPath,
            JSON.stringify(logEntry) + '\n'
        );
    };

    const getTradeHistory = (limit = 100) => {
        try {
            const trades = fs.readFileSync(tradeLogPath, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line));

            return trades.slice(-limit);
        } catch (error) {
            logError(error, { context: 'getTradeHistory' });
            return [];
        }
    };

    const getErrorHistory = (limit = 100) => {
        try {
            const errors = fs.readFileSync(errorLogPath, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line));

            return errors.slice(-limit);
        } catch (error) {
            logError(error, { context: 'getErrorHistory' });
            return [];
        }
    };

    return {
        logTrade,
        logError,
        getTradeHistory,
        getErrorHistory
    };
};

// Create alert system
const createAlertSystem = (logger) => {
    const subscribers = new Set();

    const subscribe = (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
    };

    const notify = (alert) => {
        const timestamp = new Date().toISOString();
        const alertData = {
            timestamp,
            ...alert
        };

        subscribers.forEach(callback => {
            try {
                callback(alertData);
            } catch (error) {
                logger.logError(error, { context: 'AlertSystem.notify' });
            }
        });
    };

    const tradeAlert = (tradeData) => {
        notify({
            type: 'TRADE',
            data: tradeData
        });
    };

    const errorAlert = (error, context = {}) => {
        notify({
            type: 'ERROR',
            error: error.message,
            context
        });
    };

    const balanceAlert = (balance, threshold) => {
        notify({
            type: 'BALANCE',
            balance,
            threshold
        });
    };

    const strategyAlert = (strategyName, signal) => {
        notify({
            type: 'STRATEGY',
            strategy: strategyName,
            signal
        });
    };

    return {
        subscribe,
        notify,
        tradeAlert,
        errorAlert,
        balanceAlert,
        strategyAlert
    };
};

// Create and export instances
const logger = createLogger();
const alerts = createAlertSystem(logger);

export { logger, alerts, createLogger, createAlertSystem };