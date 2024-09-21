const colors = {
    Error: 'Red',
    Warning: 'Orange',
    Success: 'Green',
    Info: 'Blue',
    Neutral: 'Gray',
    Debug: 'Purple',
    Critical: 'Red',
}

function getColor(type) {
    return colors[type] || 'White'
}

module.exports = {
    getColor,
}
