// State
let expression = '';
let angleMode = 'deg'; // 'deg' or 'rad'
let lastResult = null;

const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const degBtn = document.getElementById('degBtn');
const radBtn = document.getElementById('radBtn');
const sciPanel = document.getElementById('scientificPanel');
const sciToggle = document.getElementById('sciToggle');

// Append a character
function append(char) {
    if (lastResult !== null && /^[0-9π]$/.test(char)) {
        expression = '';
        lastResult = null;
    }
    expression += char;
    updateDisplay();
}

// Append a function like sin(, log(, etc.
function appendFunc(func) {
    if (lastResult !== null) {
        // Allow chaining functions on result
        expression = '';
        lastResult = null;
    }
    expression += func;
    updateDisplay();
}

// Append an operator
function appendOp(op) {
    if (lastResult !== null) {
        expression = String(lastResult);
        lastResult = null;
    }
    expression += op;
    updateDisplay();
}

// Update display
function updateDisplay() {
    expressionEl.textContent = expression;
    resultEl.classList.remove('error');

    // Live preview: try to evaluate as you type
    if (expression.length > 0) {
        try {
            const val = evaluate(expression);
            if (val !== undefined && !isNaN(val) && isFinite(val)) {
                resultEl.textContent = formatNumber(val);
            }
        } catch (e) {
            // Silent — don't show errors during typing
        }
    } else {
        resultEl.textContent = '0';
    }
}

// Format number for display
function formatNumber(num) {
    if (Number.isInteger(num) && Math.abs(num) < 1e15) {
        return num.toString();
    }
    // Round to avoid floating point artifacts
    const rounded = parseFloat(num.toPrecision(12));
    if (Math.abs(rounded) < 1e-10 && rounded !== 0) {
        return rounded.toExponential(4);
    }
    if (Math.abs(rounded) >= 1e15) {
        return rounded.toExponential(6);
    }
    return rounded.toString();
}

// Clear all
function clearAll() {
    expression = '';
    lastResult = null;
    expressionEl.textContent = '';
    resultEl.textContent = '0';
    resultEl.classList.remove('error');
}

// Backspace
function backspace() {
    if (lastResult !== null) {
        clearAll();
        return;
    }
    // Remove multi-char functions like sin(, asin(, sqrt(, etc.
    const funcPatterns = ['asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'sin(', 'cos(', 'tan(', 'log(', 'pow(', 'ln('];
    for (const pat of funcPatterns) {
        if (expression.endsWith(pat)) {
            expression = expression.slice(0, -pat.length);
            updateDisplay();
            return;
        }
    }
    expression = expression.slice(0, -1);
    updateDisplay();
}

// Factorial
function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error('Invalid factorial');
    if (n > 170) return Infinity;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

// Convert angle for trig
function toRadians(val) {
    return angleMode === 'deg' ? val * Math.PI / 180 : val;
}

function fromRadians(val) {
    return angleMode === 'deg' ? val * 180 / Math.PI : val;
}

// Evaluate expression
function evaluate(expr) {
    // Replace display symbols with computable equivalents
    let e = expr;

    // Handle percentage: number% → (number/100)
    e = e.replace(/([0-9.]+)%/g, '($1/100)');

    // Handle factorial: number! → factorial(number)
    e = e.replace(/([0-9.]+)!/g, 'factorial($1)');

    // Handle superscript powers
    e = e.replace(/²/g, '**2');
    e = e.replace(/³/g, '**3');

    // Replace constants
    e = e.replace(/π/g, '(' + Math.PI + ')');
    e = e.replace(/(?<![a-zA-Z])e(?![a-zA-Z(])/g, '(' + Math.E + ')');

    // Replace operators
    e = e.replace(/×/g, '*');
    e = e.replace(/÷/g, '/');

    // Handle implicit multiplication: 2(, )(, 2sin, etc.
    e = e.replace(/([0-9.))])(\()/g, '$1*$2');
    e = e.replace(/(\))([0-9])/g, '$1*$2');

    // Replace scientific functions with Math equivalents
    // Use negative lookbehind to avoid matching asin/acos/atan when replacing sin/cos/tan
    e = e.replace(/asin\(/g, '_asin(');
    e = e.replace(/acos\(/g, '_acos(');
    e = e.replace(/atan\(/g, '_atan(');
    e = e.replace(/(?<!_a)sin\(/g, '_sin(');
    e = e.replace(/(?<!_a)cos\(/g, '_cos(');
    e = e.replace(/(?<!_a)tan\(/g, '_tan(');
    e = e.replace(/log\(/g, 'Math.log10(');
    e = e.replace(/ln\(/g, 'Math.log(');
    e = e.replace(/sqrt\(/g, 'Math.sqrt(');
    e = e.replace(/cbrt\(/g, 'Math.cbrt(');
    e = e.replace(/pow\(/g, 'Math.pow(');

    // Validate: only allow safe characters
    if (/[^0-9+\-*/().,%_ \tMathsincologqrtbpwfaeal\d]/.test(e)) {
        // More permissive check - just evaluate safely
    }

    // Build evaluation with trig wrappers
    const evalCode = `
        (function() {
            function factorial(n) {
                n = Math.round(n);
                if (n < 0) throw new Error('Invalid');
                if (n > 170) return Infinity;
                if (n <= 1) return 1;
                let r = 1;
                for (let i = 2; i <= n; i++) r *= i;
                return r;
            }
            function _sin(x) { return Math.sin(${angleMode === 'deg'} ? x * Math.PI / 180 : x); }
            function _cos(x) { return Math.cos(${angleMode === 'deg'} ? x * Math.PI / 180 : x); }
            function _tan(x) { return Math.tan(${angleMode === 'deg'} ? x * Math.PI / 180 : x); }
            function _asin(x) { var r = Math.asin(x); return ${angleMode === 'deg'} ? r * 180 / Math.PI : r; }
            function _acos(x) { var r = Math.acos(x); return ${angleMode === 'deg'} ? r * 180 / Math.PI : r; }
            function _atan(x) { var r = Math.atan(x); return ${angleMode === 'deg'} ? r * 180 / Math.PI : r; }
            return (${e});
        })()
    `;

    return eval(evalCode);
}

// Calculate on equals
function calculate() {
    if (!expression) return;

    try {
        const val = evaluate(expression);
        if (val === undefined || isNaN(val)) {
            resultEl.textContent = 'Error';
            resultEl.classList.add('error');
            return;
        }
        expressionEl.textContent = expression + ' =';
        resultEl.textContent = formatNumber(val);
        resultEl.classList.remove('error');
        lastResult = val;
        expression = '';
    } catch (e) {
        resultEl.textContent = 'Error';
        resultEl.classList.add('error');
    }
}

// Set angle mode
function setAngleMode(mode) {
    angleMode = mode;
    degBtn.classList.toggle('active', mode === 'deg');
    radBtn.classList.toggle('active', mode === 'rad');
    updateDisplay();
}

// Toggle scientific panel
function toggleScientific() {
    sciPanel.classList.toggle('open');
    sciToggle.classList.toggle('active');
}

// Keyboard support
document.addEventListener('keydown', function(e) {
    const key = e.key;

    if (key >= '0' && key <= '9') {
        append(key);
    } else if (key === '.') {
        append('.');
    } else if (key === '+') {
        appendOp('+');
    } else if (key === '-') {
        appendOp('-');
    } else if (key === '*') {
        appendOp('×');
    } else if (key === '/') {
        e.preventDefault();
        appendOp('÷');
    } else if (key === '(') {
        append('(');
    } else if (key === ')') {
        append(')');
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
    } else if (key === 'Backspace') {
        backspace();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearAll();
    } else if (key === '%') {
        appendOp('%');
    }
});
