// Unified formatting utilities for VOROO-QR system

// Format currency to Egyptian Pound
function formatCurrency(amount) {
    return `${parseFloat(amount).toFixed(0)} ج.م`;
}

// Format date/time with Egypt timezone
function formatDateTime(date) {
    const options = {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return new Date(date).toLocaleDateString('ar-EG', options);
}

// Format time only with Egypt timezone
function formatTime(date) {
    const options = {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return new Date(date).toLocaleTimeString('ar-EG', options);
}

// Format time short (HH:MM only)
function formatTimeShort(date) {
    const options = {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleTimeString('ar-EG', options);
}

// Get system name
function getSystemName() {
    return 'VOROO-QR';
}

// System colors
const SYSTEM_COLORS = {
    primary: '#ea580c',      // Orange
    secondary: '#f59e0b',    // Amber
    success: '#10b981',      // Green
    warning: '#f59e0b',      // Amber
    danger: '#ef4444',       // Red
    info: '#3b82f6'          // Blue
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatDateTime,
        formatTime,
        formatTimeShort,
        getSystemName,
        SYSTEM_COLORS
    };
}
