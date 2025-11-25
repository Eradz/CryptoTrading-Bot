# Bot Creation Frontend Integration Guide

## Overview

This guide shows how to integrate the new simplified bot creation system into your frontend application.

## Feature Summary

Users can now create trading bots in **30 seconds** by:
1. Viewing available templates
2. Selecting a strategy type
3. Entering a trading pair
4. Bot is instantly ready to trade

---

## Frontend Integration Examples

### 1. Display Available Templates

Fetch all available bot templates on page load.

**JavaScript/React**:
```javascript
import axios from 'axios';

const BotTemplateSelector = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/v1/bots/templates', {
        headers: { 'Content-Type': 'application/json' }
      });
      setTemplates(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading templates...</div>;

  return (
    <div className="templates-grid">
      {templates.map(template => (
        <div key={template.id} className="template-card">
          <h3>{template.name}</h3>
          <p>{template.description}</p>
          <div className="template-info">
            <span className="win-rate">📊 Win Rate: {template.estimatedWinRate}</span>
            <span className="risk-profile">⚠️ Risk: {template.riskProfile}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BotTemplateSelector;
```

**Response Example**:
```json
{
  "data": [
    {
      "id": "RSI_SMA_MACD",
      "name": "RSI + SMA + MACD Strategy",
      "description": "Momentum-based strategy combining RSI overbought/oversold with SMA crossovers and MACD confirmation",
      "strategy": "RSI_SMA_MACD",
      "interval": "1h",
      "estimatedWinRate": "55-65%",
      "riskProfile": "Moderate"
    },
    {
      "id": "BOLLINGER_BANDS",
      "name": "Bollinger Bands Strategy",
      "description": "Mean-reversion strategy using Bollinger Bands with volatility confirmation",
      "strategy": "BOLLINGER_BANDS",
      "interval": "1h",
      "estimatedWinRate": "50-60%",
      "riskProfile": "Moderate"
    },
    {
      "id": "HYBRID",
      "name": "Hybrid Multi-Strategy",
      "description": "Conservative strategy combining multiple indicators with high confidence signals (Recommended for beginners)",
      "strategy": "HYBRID",
      "interval": "4h",
      "estimatedWinRate": "65-75%",
      "riskProfile": "Conservative"
    }
  ]
}
```

---

### 2. Create Bot from Template

Handle template selection and bot creation.

**JavaScript/React**:
```javascript
const BotCreationForm = ({ userId, exchangeId }) => {
  const [formData, setFormData] = useState({
    botType: '',
    symbol: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdBot, setCreatedBot] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateBot = async (e) => {
    e.preventDefault();
    
    if (!formData.botType || !formData.symbol) {
      setError('Bot type and trading pair are required');
      return;
    }

    // Validate symbol format
    if (!/^[A-Z]+\/[A-Z]+$/.test(formData.symbol)) {
      setError('Invalid symbol format. Use format like BTC/USDT');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        botType: formData.botType,
        symbol: formData.symbol.toUpperCase(),
        name: formData.name || undefined
      };

      const response = await axios.post(
        `/api/v1/bots/quick-create/${userId}/${exchangeId}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      setCreatedBot(response.data.data.bot);
      setSuccess(true);
      setFormData({ botType: '', symbol: '', name: '' });

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create bot';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bot-creation-container">
      <form onSubmit={handleCreateBot} className="creation-form">
        <div className="form-group">
          <label htmlFor="botType">Select Strategy *</label>
          <select
            id="botType"
            name="botType"
            value={formData.botType}
            onChange={handleInputChange}
            required
          >
            <option value="">-- Choose Strategy --</option>
            <option value="RSI_SMA_MACD">RSI + SMA + MACD (Moderate)</option>
            <option value="BOLLINGER_BANDS">Bollinger Bands (Moderate)</option>
            <option value="HYBRID">Hybrid Multi-Strategy (Conservative)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="symbol">Trading Pair *</label>
          <input
            id="symbol"
            type="text"
            name="symbol"
            placeholder="e.g., BTC/USDT"
            value={formData.symbol}
            onChange={handleInputChange}
            required
          />
          <small>Format: ASSET/QUOTE (e.g., BTC/USDT, ETH/USDT)</small>
        </div>

        <div className="form-group">
          <label htmlFor="name">Bot Name (Optional)</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="e.g., My Trading Bot"
            value={formData.name}
            onChange={handleInputChange}
          />
          <small>If not provided, will use: Strategy Name - Trading Pair</small>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success">
            ✅ Bot created successfully! (ID: {createdBot?.id})
            <button 
              type="button" 
              onClick={() => startBot(createdBot?.id)}
              className="btn-small"
            >
              Start Trading
            </button>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Creating Bot...' : 'Create Bot'}
        </button>
      </form>
    </div>
  );
};

export default BotCreationForm;
```

---

### 3. Start Bot Trading

Activate a bot to begin trading.

**JavaScript/React**:
```javascript
const startBot = async (botId) => {
  try {
    const response = await axios.post(
      `/api/v1/bots/bot/${botId}/start`,
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Bot started:', response.data);
    // Refresh bot list or dashboard
    return response.data.data;
  } catch (error) {
    console.error('Failed to start bot:', error.response?.data);
    throw error;
  }
};
```

---

### 4. View User's Bots

Display all bots for the current user.

**JavaScript/React**:
```javascript
const UserBotsList = ({ userId }) => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserBots();
  }, [userId]);

  const fetchUserBots = async () => {
    try {
      const response = await axios.get(
        `/api/v1/bots/${userId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      setBots(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch bots:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading bots...</div>;
  if (!bots.length) return <div>No bots created yet</div>;

  return (
    <table className="bots-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Strategy</th>
          <th>Symbol</th>
          <th>Status</th>
          <th>Win Rate</th>
          <th>Total Profit</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {bots.map(bot => (
          <tr key={bot.id}>
            <td>{bot.name}</td>
            <td>{bot.strategy}</td>
            <td>{bot.symbol}</td>
            <td>
              <span className={`status-badge ${bot.isActive ? 'active' : 'inactive'}`}>
                {bot.isActive ? '🟢 Active' : '⚫ Inactive'}
              </span>
            </td>
            <td>{bot.performance?.winRate.toFixed(2)}%</td>
            <td>${bot.performance?.netProfit.toFixed(2)}</td>
            <td>
              {bot.isActive ? (
                <button onClick={() => stopBot(bot.id)}>Stop</button>
              ) : (
                <button onClick={() => startBot(bot.id)}>Start</button>
              )}
              <button onClick={() => viewBotDetails(bot.id)}>Details</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserBotsList;
```

---

### 5. Monitor Bot Performance

Display real-time performance metrics.

**JavaScript/React**:
```javascript
const BotPerformanceDashboard = ({ botId }) => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPerformance, 30000);
    return () => clearInterval(interval);
  }, [botId]);

  const fetchPerformance = async () => {
    try {
      const response = await axios.get(
        `/api/v1/bots/bot/${botId}/performance`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      setPerformance(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading performance...</div>;
  if (!performance) return <div>No data available</div>;

  return (
    <div className="performance-dashboard">
      <div className="metric-card">
        <h4>Total Trades</h4>
        <p className="value">{performance.totalTrades}</p>
      </div>

      <div className="metric-card">
        <h4>Win Rate</h4>
        <p className="value">{performance.winRate.toFixed(2)}%</p>
        <span className="detail">
          {performance.winningTrades}W / {performance.losingTrades}L
        </span>
      </div>

      <div className="metric-card">
        <h4>Net Profit</h4>
        <p className={`value ${performance.netProfit >= 0 ? 'positive' : 'negative'}`}>
          ${performance.netProfit.toFixed(2)}
        </p>
        <span className="detail">
          Gross: ${performance.totalProfit.toFixed(2)} | Loss: ${performance.totalLoss.toFixed(2)}
        </span>
      </div>

      <div className="metric-card">
        <h4>Sharpe Ratio</h4>
        <p className="value">{performance.sharpeRatio.toFixed(2)}</p>
      </div>

      <div className="metric-card">
        <h4>Max Drawdown</h4>
        <p className="value">{performance.maxDrawdown.toFixed(2)}%</p>
      </div>

      <div className="metric-card">
        <h4>Last Trade</h4>
        <p className="value">
          {performance.lastTradeAt 
            ? new Date(performance.lastTradeAt).toLocaleString()
            : 'No trades yet'
          }
        </p>
      </div>
    </div>
  );
};

export default BotPerformanceDashboard;
```

---

### 6. Complete Bot Creation Page (Full Example)

**React Component**:
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BotCreationPage.css';

const BotCreationPage = ({ userId, exchangeId }) => {
  const [step, setStep] = useState('templates'); // 'templates' or 'form'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [createdBot, setCreatedBot] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/v1/bots/templates');
      setTemplates(response.data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setStep('form');
  };

  const handleCreateBot = async (e) => {
    e.preventDefault();

    if (!formData.symbol) {
      alert('Please enter a trading pair');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `/api/v1/bots/quick-create/${userId}/${exchangeId}`,
        {
          botType: selectedTemplate.id,
          symbol: formData.symbol.toUpperCase(),
          name: formData.name || undefined
        }
      );

      setCreatedBot(response.data.data.bot);
      setStep('success');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrading = async () => {
    try {
      await axios.post(`/api/v1/bots/bot/${createdBot.id}/start`);
      alert('Bot started successfully!');
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Failed to start bot');
    }
  };

  return (
    <div className="bot-creation-page">
      {step === 'templates' && (
        <div className="templates-step">
          <h1>Choose Your Trading Strategy</h1>
          <p>Select the strategy that matches your trading style</p>
          
          <div className="templates-grid">
            {templates.map(template => (
              <div 
                key={template.id} 
                className="template-card"
                onClick={() => handleTemplateSelect(template)}
              >
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="card-footer">
                  <span>📊 {template.estimatedWinRate}</span>
                  <span>⚠️ {template.riskProfile}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="form-step">
          <button 
            className="btn-back" 
            onClick={() => setStep('templates')}
          >
            ← Back
          </button>

          <h1>Create {selectedTemplate.name}</h1>
          
          <form onSubmit={handleCreateBot}>
            <div className="form-group">
              <label>Trading Pair *</label>
              <input
                type="text"
                placeholder="BTC/USDT"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                required
              />
              <small>Format: ASSET/QUOTE</small>
            </div>

            <div className="form-group">
              <label>Bot Name (Optional)</label>
              <input
                type="text"
                placeholder="My Trading Bot"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Bot'}
            </button>
          </form>

          <div className="strategy-info">
            <h4>Strategy Details</h4>
            <p><strong>Estimated Win Rate:</strong> {selectedTemplate.estimatedWinRate}</p>
            <p><strong>Risk Profile:</strong> {selectedTemplate.riskProfile}</p>
            <p><strong>Default Interval:</strong> {selectedTemplate.interval}</p>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="success-step">
          <h1>✅ Bot Created Successfully!</h1>
          
          <div className="bot-info">
            <p><strong>Bot ID:</strong> {createdBot.id}</p>
            <p><strong>Name:</strong> {createdBot.name}</p>
            <p><strong>Strategy:</strong> {createdBot.strategy}</p>
            <p><strong>Trading Pair:</strong> {createdBot.symbol}</p>
          </div>

          <div className="actions">
            <button 
              className="btn-primary"
              onClick={handleStartTrading}
            >
              Start Trading Now 🚀
            </button>
            <button 
              className="btn-secondary"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </button>
          </div>

          <div className="tips">
            <h4>Tips:</h4>
            <ul>
              <li>Your bot is now ready to trade</li>
              <li>Click "Start Trading" to activate it</li>
              <li>Monitor performance in real-time</li>
              <li>You can stop/pause at any time</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotCreationPage;
```

---

### 7. Recommended UI Styling

**CSS Suggestions** (`BotCreationPage.css`):
```css
.bot-creation-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.templates-step h1 {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 10px;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin: 40px 0;
}

.template-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: #4CAF50;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
  transform: translateY(-2px);
}

.template-card h3 {
  margin: 0 0 12px 0;
  color: #333;
}

.template-card p {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #eee;
  font-size: 13px;
}

.form-step {
  background: #f9f9f9;
  padding: 40px;
  border-radius: 12px;
  max-width: 500px;
  margin: 0 auto;
}

.btn-back {
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 20px;
  color: #666;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: #999;
  font-size: 12px;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #45a049;
}

.success-step {
  text-align: center;
  padding: 40px;
}

.bot-info {
  background: #f0f0f0;
  padding: 24px;
  border-radius: 8px;
  margin: 24px 0;
  text-align: left;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 24px 0;
}

.tips {
  background: #e8f5e9;
  padding: 24px;
  border-radius: 8px;
  margin-top: 24px;
  text-align: left;
}

.tips ul {
  margin: 12px 0;
  padding-left: 20px;
}

.tips li {
  margin: 8px 0;
}
```

---

## API Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success (GET, PUT, POST start/stop) | Display success message |
| 201 | Bot created successfully | Show success with bot details |
| 400 | Bad request (invalid input) | Show error message from response |
| 401 | Unauthorized | Redirect to login |
| 500 | Server error | Show generic error, log details |

---

## Error Handling

**Common Errors & Solutions**:

```javascript
const handleApiError = (error) => {
  if (error.response?.status === 400) {
    // Invalid input - show validation error
    return error.response.data.message;
  } else if (error.response?.status === 401) {
    // Unauthorized - redirect to login
    window.location.href = '/login';
  } else if (error.response?.status === 500) {
    // Server error - show generic message
    return 'Server error. Please try again later.';
  } else {
    return 'Unknown error occurred.';
  }
};
```

**Common Validation Errors**:
- `"Invalid bot type"` → Check that botType is one of: RSI_SMA_MACD, BOLLINGER_BANDS, HYBRID
- `"Bot type and symbol are required"` → Ensure both fields are filled
- `"Symbol must be in format like BTC/USDT"` → Symbol format is invalid (use uppercase letters and / separator)
- `"User ID and Exchange ID are required"` → Bot creation endpoint requires both path parameters

---

## Best Practices

✅ **Do**:
- Fetch templates on page load for best UX
- Show loading states during API calls
- Validate symbol format before submission
- Display bot ID for reference
- Refresh bot list after creation
- Provide visual feedback for success/error

❌ **Don't**:
- Create bots without validating input
- Allow updates while bot is active
- Forget to handle network errors
- Display raw error messages to users
- Block UI without loading indicator

---

## Summary

The new bot creation system simplifies the user experience significantly:

- **Before**: Users had to understand and configure 20+ parameters
- **After**: Users select a strategy type and trading pair, that's it!

All complex configurations are handled by the templates, making trading bot creation accessible to beginners while still offering advanced customization for power users.
