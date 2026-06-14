import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2 } from 'lucide-react';

export default function BasicCalculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState(0);
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const calculate = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? 'Error' : a / b;
      default: return b;
    }
  };

  const inputDigit = (digit) => {
    if (display === 'Error') {
      setDisplay(String(digit));
      setWaitingForNewValue(false);
      return;
    }
    if (waitingForNewValue) {
      setDisplay(String(digit));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForNewValue || display === 'Error') {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const backspace = () => {
    if (waitingForNewValue || display === 'Error') return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const toggleSign = () => {
    if (display === 'Error') return;
    setDisplay(display.charAt(0) === '-' ? display.slice(1) : '-' + display);
  };

  const performOperation = (nextOp) => {
    if (display === 'Error') return;
    const inputValue = parseFloat(display);

    if (operator && !waitingForNewValue) {
      const result = calculate(prevValue, inputValue, operator);
      setDisplay(String(result));
      setPrevValue(result === 'Error' ? null : result);
    } else {
      setPrevValue(inputValue);
    }

    setWaitingForNewValue(true);
    setOperator(nextOp);
  };

  const handleEqual = () => {
    if (!operator || prevValue === null || display === 'Error') return;
    const inputValue = parseFloat(display);
    const result = calculate(prevValue, inputValue, operator);
    
    // Round to handle floating point issues nicely (up to 10 decimal places)
    const finalResult = result === 'Error' ? result : Math.round(result * 10000000000) / 10000000000;
    
    setDisplay(String(finalResult));
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewValue(true);
  };

  const performUnary = (type) => {
    if (display === 'Error') return;
    const val = parseFloat(display);
    let res;
    if (type === 'sqrt') {
      res = val < 0 ? 'Error' : Math.sqrt(val);
    } else if (type === '1/x') {
      res = val === 0 ? 'Error' : 1 / val;
    } else if (type === '%') {
      res = val / 100;
    }
    
    const finalResult = res === 'Error' ? res : Math.round(res * 10000000000) / 10000000000;
    setDisplay(String(finalResult));
    setWaitingForNewValue(true);
  };

  const memoryAction = (type) => {
    if (display === 'Error') return;
    const val = parseFloat(display);
    switch (type) {
      case 'MC': setMemory(0); break;
      case 'MR': 
        setDisplay(String(memory)); 
        setWaitingForNewValue(true);
        break;
      case 'MS': setMemory(val); break;
      case 'M+': setMemory(memory + val); break;
      case 'M-': setMemory(memory - val); break;
    }
  };

  const btnClass = "bg-theme-card-alt hover:bg-brand-primary/20 text-theme-text font-bold py-3 rounded-lg border border-theme-border transition-colors flex items-center justify-center shadow-sm hover:shadow-brand-primary/10";
  const getOpClass = (op) => {
    const isActive = operator === op && waitingForNewValue;
    if (isActive) {
      return "bg-brand-primary text-white font-bold py-3 rounded-lg border border-brand-primary transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]";
    }
    return "bg-brand-primary/10 hover:bg-brand-primary/30 text-brand-primary font-bold py-3 rounded-lg border border-brand-primary/20 transition-colors flex items-center justify-center shadow-sm";
  };
  const memClass = "bg-theme-glass hover:bg-theme-border text-theme-text-muted text-xs font-bold py-2 rounded border border-theme-border transition-colors";

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`fixed z-[9999] bg-theme-bg border border-theme-border shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col ${isMinimized ? 'w-[320px] h-auto' : 'w-[320px] h-auto pb-4'}`}
      style={{ left: 'calc(100vw - 360px)', top: '100px' }} // Initial position
    >
      {/* Header / Drag Handle */}
      <div className="bg-theme-card border-b border-theme-border px-4 py-3 flex justify-between items-center cursor-move" id="calculator-drag-handle">
        <div className="font-bold text-sm text-theme-text flex items-center gap-2">
          Calculator
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-theme-border rounded text-theme-text-muted hover:text-white transition-colors">
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded text-theme-text-muted hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 flex flex-col gap-3 flex-1 overflow-hidden"
          >
            {/* Display */}
            <div className="bg-theme-card-alt border border-theme-border rounded-xl p-3 flex flex-col items-end justify-end relative h-20 shadow-inner">
              <div className="flex justify-between items-center w-full absolute top-2 px-3 left-0">
                <span className="text-xs text-brand-secondary font-mono font-bold">{memory !== 0 ? 'M' : ''}</span>
                <span className="text-xs text-theme-text-muted font-mono">{prevValue !== null && operator ? `${prevValue} ${operator}` : ''}</span>
              </div>
              <div className="text-3xl font-mono font-bold text-theme-text overflow-hidden text-right w-full tracking-wider mt-4" style={{ wordBreak: 'break-all' }}>
                {display}
              </div>
            </div>

            {/* Memory Row */}
            <div className="grid grid-cols-5 gap-1.5 mt-1">
              <button onClick={() => memoryAction('MC')} className={memClass}>MC</button>
              <button onClick={() => memoryAction('MR')} className={memClass}>MR</button>
              <button onClick={() => memoryAction('MS')} className={memClass}>MS</button>
              <button onClick={() => memoryAction('M+')} className={memClass}>M+</button>
              <button onClick={() => memoryAction('M-')} className={memClass}>M-</button>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-4 gap-2 flex-1 mt-1">
              <button onClick={() => performUnary('%')} className={btnClass}>%</button>
              <button onClick={clear} className={btnClass}>C</button>
              <button onClick={backspace} className={btnClass}>←</button>
              <button onClick={() => performOperation('÷')} className={getOpClass('÷')}>÷</button>

              <button onClick={() => performUnary('1/x')} className={btnClass}>1/x</button>
              <button onClick={() => performUnary('sqrt')} className={btnClass}>√</button>
              <button onClick={toggleSign} className={btnClass}>+/-</button>
              <button onClick={() => performOperation('×')} className={getOpClass('×')}>×</button>

              <button onClick={() => inputDigit(7)} className={btnClass}>7</button>
              <button onClick={() => inputDigit(8)} className={btnClass}>8</button>
              <button onClick={() => inputDigit(9)} className={btnClass}>9</button>
              <button onClick={() => performOperation('-')} className={getOpClass('-')}>-</button>

              <button onClick={() => inputDigit(4)} className={btnClass}>4</button>
              <button onClick={() => inputDigit(5)} className={btnClass}>5</button>
              <button onClick={() => inputDigit(6)} className={btnClass}>6</button>
              <button onClick={() => performOperation('+')} className={getOpClass('+')}>+</button>

              <button onClick={() => inputDigit(1)} className={btnClass}>1</button>
              <button onClick={() => inputDigit(2)} className={btnClass}>2</button>
              <button onClick={() => inputDigit(3)} className={btnClass}>3</button>
              <button onClick={handleEqual} className={`row-span-2 ${getOpClass('=')} !bg-brand-secondary !text-white !border-brand-secondary`}>=</button>

              <button onClick={() => inputDigit(0)} className={`col-span-2 ${btnClass}`}>0</button>
              <button onClick={inputDot} className={btnClass}>.</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
