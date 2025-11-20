import { body, param, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({ errors: errors.array() });
  };
};

export const tradeValidation = [
  param('id').isInt().withMessage('User id must be an integer'),
  param('exchangeId').isInt().withMessage('Exchange id must be an integer'),
  body('symbol').isString().withMessage('symbol is required'),
  body('side').optional().isIn(['buy', 'sell']).withMessage('side must be buy or sell'),
  body('type').optional().isIn(['market', 'limit']).withMessage('type must be market or limit'),
  body('amount').optional().isNumeric().withMessage('amount must be a number'),
  body('price').optional().isNumeric().withMessage('price must be a number')
];

export const signupValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
  body('username').isString().withMessage('username is required')
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('password is required')
];

export const exchangeCreateValidation = [
  param('id').isInt().withMessage('User id must be an integer'),
  body('exchangeName').isString().withMessage('exchangeName is required'),
  body('eak').isString().withMessage('eak is required'),
  body('eas').isString().withMessage('eas is required')
];
