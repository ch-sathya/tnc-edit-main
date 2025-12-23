import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Minus, Maximize2 } from 'lucide-react';

interface EditorTerminalProps {
  output: string[];
  onCommand: (command: string) => void;
  onClose: () => void;
}

export const EditorTerminal = ({ output, onCommand, onClose }: EditorTerminalProps) => {
  const [input, setInput] = useState('');
  const [height, setHeight] = useState(200);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new output is added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand(input);
      setInput('');
    }
  };

  return (
    <div 
      className="border-t bg-zinc-900 flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Terminal header */}
      <div className="h-8 bg-zinc-800 flex items-center justify-between px-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">TERMINAL</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setHeight(h => Math.max(100, h - 50))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setHeight(h => Math.min(500, h + 50))}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto font-mono text-sm p-3"
        onClick={() => inputRef.current?.focus()}
      >
        {output.map((line, i) => (
          <div 
            key={i} 
            className={`whitespace-pre-wrap ${
              line.startsWith('$') 
                ? 'text-green-400' 
                : line.startsWith('>') 
                  ? 'text-zinc-400' 
                  : 'text-zinc-200'
            }`}
          >
            {line}
          </div>
        ))}
        
        {/* Input line */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
          <span className="text-green-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-zinc-200 caret-green-400"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};
