/**
 * Retry handler with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise}
 */
export const retryWithBackoff = async (fn, options = {}) => {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        backoffMultiplier = 2,
        shouldRetry = (error) => true,
        onRetry = null
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on last attempt
            if (attempt === maxRetries) {
                throw error;
            }

            // Check if we should retry
            if (!shouldRetry(error)) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt),
                maxDelay
            );

            // Add jitter to prevent thundering herd
            const jitter = delay * 0.1 * Math.random();
            const totalDelay = delay + jitter;

            if (onRetry) {
                onRetry({
                    attempt,
                    delay: totalDelay,
                    error: error.message
                });
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
    }

    throw lastError;
};

/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.successThreshold = options.successThreshold || 2;
        this.timeout = options.timeout || 60000; // 1 minute
        this.name = options.name || 'CircuitBreaker';

        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = Date.now();
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttemptTime) {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
            // Try half-open
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;

        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
            }
        }
    }

    onFailure() {
        this.failureCount++;

        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.successCount = 0;
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
        }
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttemptTime: this.state === 'OPEN' ? new Date(this.nextAttemptTime) : null
        };
    }

    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
    }
}

/**
 * Create circuit breakers for different exchanges
 */
export const createExchangeCircuitBreakers = () => {
    return {
        binance: new CircuitBreaker({ name: 'binance', failureThreshold: 5 }),
        binanceus: new CircuitBreaker({ name: 'binanceus', failureThreshold: 5 }),
        kraken: new CircuitBreaker({ name: 'kraken', failureThreshold: 5 }),
        coinbase: new CircuitBreaker({ name: 'coinbase', failureThreshold: 5 })
    };
};

export const exchangeCircuitBreakers = createExchangeCircuitBreakers();
