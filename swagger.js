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
            }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token'
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