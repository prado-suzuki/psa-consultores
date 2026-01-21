import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface MarkdownEditorProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

const MarkdownEditor = React.forwardRef<HTMLTextAreaElement, MarkdownEditorProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const insertFormatting = (prefix: string, suffix: string = prefix) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);

      onChange(newText);

      // Restore cursor position after formatting
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectedText
          ? start + prefix.length + selectedText.length + suffix.length
          : start + prefix.length;
        textarea.setSelectionRange(
          selectedText ? start + prefix.length : newCursorPos,
          selectedText ? start + prefix.length + selectedText.length : newCursorPos,
        );
      }, 0);
    };

    const insertList = (ordered: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      // Split selected text into lines and add list markers
      const lines = selectedText.split("\n");
      const formattedLines = lines.map((line, index) => {
        if (line.trim() === "") return line;
        const marker = ordered ? `${index + 1}. ` : "- ";
        return marker + line;
      });

      const newText = formattedLines.join("\n");

      // If no selection, just insert a list marker at the start of current line
      if (start === end) {
        // Find the start of current line
        const beforeCursor = value.substring(0, start);
        const lineStart = beforeCursor.lastIndexOf("\n") + 1;
        const marker = ordered ? "1. " : "- ";

        const updatedValue = value.substring(0, lineStart) + marker + value.substring(lineStart);

        onChange(updatedValue);

        setTimeout(() => {
          textarea.focus();
          const newPos = start + marker.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      } else {
        const updatedValue = value.substring(0, start) + newText + value.substring(end);

        onChange(updatedValue);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + newText.length);
        }, 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        insertFormatting("**");
      }
      // Ctrl/Cmd + I for italic
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        insertFormatting("*");
      }
    };

    return (
      <div className={cn("space-y-2", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 border border-input rounded-md bg-muted/30">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting("**")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Negrito (Ctrl+B)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting("*")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Itálico (Ctrl+I)</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertList(false)}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Lista com marcadores</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertList(true)}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Lista numerada</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-mono text-sm"
          {...props}
        />
      </div>
    );
  },
);

MarkdownEditor.displayName = "MarkdownEditor";

export { MarkdownEditor };
