import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Crypto Trading Bot API',
            version: '1.0.0',
            description: 'API documentation for the Crypto Trading Bot',
            contact: {
                name: 'API Support',
                email: 'anaguchidiebere@gmail.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:5001',
                description: 'Development server'
            },
            {
                url: 'https://cryptotrading-bot.onrender.com/',
                description: 'Production server'
            }

        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token'
                }
            },
            schemas: {
                Trade: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        exchangeOrderId: {
                            type: 'string',
                            example: '12345678'
                        },
                        userId: {
                            type: 'integer',
                            example: 1
                        },
                        strategyId: {
                            type: 'string',
                            example: 'rsi-001',
                            nullable: true
                        },
                        symbol: {
                            type: 'string',
                            example: 'BTC/USDT'
                        },
                        side: {
                            type: 'string',
                            enum: ['buy', 'sell'],
                            example: 'buy'
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'failed'],
                            example: 'filled'
                        },
                        quantity: {
                            type: 'number',
                            example: 0.05
                        },
                        executedQty: {
                            type: 'number',
                            example: 0.05
                        },
                        price: {
                            type: 'number',
                            example: 45000
                        },
                        avgExecutedPrice: {
                            type: 'number',
                            example: 45000,
                            nullable: true
                        },
                        cost: {
                            type: 'number',
                            example: 2250,
                            nullable: true
                        },
                        fee: {
                            type: 'number',
                            example: 2.25
                        },
                        feeCurrency: {
                            type: 'string',
                            example: 'USDT'
                        },
                        stopLoss: {
                            type: 'number',
                            example: 44100,
                            nullable: true
                        },
                        takeProfit: {
                            type: 'number',
                            example: 45900,
                            nullable: true
                        },
                        riskPercentage: {
                            type: 'number',
                            example: 1
                        },
                        riskRewardRatio: {
                            type: 'number',
                            example: 2
                        },
                        profitLoss: {
                            type: 'number',
                            example: 150.50,
                            nullable: true
                        },
                        profitLossPercent: {
                            type: 'number',
                            example: 6.67,
                            nullable: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        filledAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        closedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        }
                    }
                },
                TradeRequest: {
                    type: 'object',
                    properties: {
                        symbol: {
                            type: 'string',
                            example: 'BTC/USDT'
                        },
                        side: {
                            type: 'string',
                            enum: ['buy', 'sell'],
                            description: 'Trade side (ignored if strategyId provided)'
                        },
                        strategyId: {
                            type: 'string',
                            example: 'rsi-001',
                            description: 'Strategy ID (optional, if provided side is ignored)'
                        },
                        type: {
                            type: 'string',
                            enum: ['market', 'limit'],
                            default: 'market'
                        },
                        price: {
                            type: 'number',
                            example: 45000,
                            description: 'Required if type=limit'
                        },
                        riskPercentage: {
                            type: 'number',
                            default: 1,
                            description: 'Risk percentage (1-5%)'
                        },
                        riskRewardRatio: {
                            type: 'number',
                            default: 2
                        }
                    }
                },
                TradeResponse: {
                    type: 'object',
                    properties: {
                        trade: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['success', 'failed']
                                },
                                tradeRecord: {
                                    $ref: '#/components/schemas/Trade'
                                },
                                positionSize: {
                                    type: 'number',
                                    example: 0.05
                                },
                                entryPrice: {
                                    type: 'number',
                                    example: 45000
                                },
                                stopLoss: {
                                    type: 'number',
                                    example: 44100
                                },
                                takeProfit: {
                                    type: 'number',
                                    example: 45900
                                }
                            }
                        },
                        signal: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                action: {
                                    type: 'string',
                                    enum: ['buy', 'sell']
                                },
                                symbol: {
                                    type: 'string'
                                },
                                price: {
                                    type: 'number'
                                },
                                reason: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    // Path to the API docs
    apis: [
        './routes/*/*.js',
        './models/*.js'
    ]
};

export const specs = swaggerJsdoc(options);