'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
      <div className="mb-4">
        <div className="bg-gray-100 rounded p-4 text-right text-2xl font-mono min-h-[3rem] flex items-center justify-end">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="outline"
          onClick={clear}
          className="col-span-2 h-12 text-lg"
        >
          Clear
        </Button>
        <Button
          variant="outline"
          onClick={() => inputOperation('/')}
          className="h-12 text-lg"
        >
          ÷
        </Button>
        <Button
          variant="outline"
          onClick={() => inputOperation('*')}
          className="h-12 text-lg"
        >
          ×
        </Button>

        <Button
          variant="outline"
          onClick={() => inputNumber('7')}
          className="h-12 text-lg"
        >
          7
        </Button>
        <Button
          variant="outline"
          onClick={() => inputNumber('8')}
          className="h-12 text-lg"
        >
          8
        </Button>
        <Button
          variant="outline"
          onClick={() => inputNumber('9')}
          className="h-12 text-lg"
        >
          9
        </Button>
        <Button
          variant="outline"
          onClick={() => inputOperation('-')}
          className="h-12 text-lg"
        >
          −
        </Button>

        <Button
          variant="outline"
          onClick={() => inputNumber('4')}
          className="h-12 text-lg"
        >
          4
        </Button>
        <Button
          variant="outline"
          onClick={() => inputNumber('5')}
          className="h-12 text-lg"
        >
          5
        </Button>
        <Button
          variant="outline"
          onClick={() => inputNumber('6')}
          className="h-12 text-lg"
        >
          6
        </Button>
        <Button
          variant="outline"
          onClick={() => inputOperation('+')}
          className="h-12 text-lg"
        >
          +
        </Button>

        <Button
          variant="outline"
          onClick={() => inputNumber('1')}
          className="h-12 text-lg"
        >
          1
        </Button>
        <Button
          variant="outline"
          onClick={() => inputNumber('2')}
          className="h-12 text-lg"
        >
          2
        </Button>
        <Button
          variant="outline"
          onClick={() => inputNumber('3')}
          className="h-12 text-lg"
        >
          3
        </Button>
        <Button
          variant="default"
          onClick={performCalculation}
          className="h-12 text-lg row-span-2"
        >
          =
        </Button>

        <Button
          variant="outline"
          onClick={() => inputNumber('0')}
          className="col-span-2 h-12 text-lg"
        >
          0
        </Button>
        <Button
          variant="outline"
          onClick={inputDecimal}
          className="h-12 text-lg"
        >
          .
        </Button>
      </div>
    </div>
  );
}
