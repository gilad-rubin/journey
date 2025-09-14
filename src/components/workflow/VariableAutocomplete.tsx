import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  availableVariables: string[];
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

interface PopupPosition {
  top: number;
  left: number;
}

export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  value,
  onChange,
  availableVariables,
  placeholder,
  className = "",
  multiline = false,
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({
    top: 0,
    left: 0,
  });
  const [currentSearch, setCurrentSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const ref = multiline ? textareaRef : inputRef;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPopup]);

  const updatePopupPosition = (
    element: HTMLElement,
    cursorPosition: number,
  ) => {
    // Create a temporary span to measure text width
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.style.whiteSpace = "pre";
    tempSpan.style.font = window.getComputedStyle(element).font;
    tempSpan.textContent = value.substring(0, cursorPosition);
    document.body.appendChild(tempSpan);

    const rect = element.getBoundingClientRect();
    const textWidth = tempSpan.offsetWidth;

    document.body.removeChild(tempSpan);

    setPopupPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX + Math.min(textWidth, rect.width - 200),
    });
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    const element = ref.current;
    if (!element) return;

    const cursorPosition = element.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const atSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (atSymbolIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(atSymbolIndex + 1);
      const filtered = availableVariables.filter((variable) =>
        variable.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      if (filtered.length > 0) {
        setFilteredVariables(filtered);
        setCurrentSearch(searchTerm);
        setSelectedIndex(0);
        setShowPopup(true);
        updatePopupPosition(element, cursorPosition);
      } else {
        setShowPopup(false);
      }
    } else {
      setShowPopup(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPopup) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredVariables.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredVariables.length) % filteredVariables.length,
        );
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        selectVariable(filteredVariables[selectedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setShowPopup(false);
        break;
    }
  };

  const selectVariable = (variable: string) => {
    const element = ref.current;
    if (!element) return;

    const cursorPosition = element.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const atSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (atSymbolIndex !== -1) {
      const newValue =
        value.substring(0, atSymbolIndex) +
        `{${variable}}` +
        value.substring(cursorPosition);

      onChange(newValue);
      setShowPopup(false);

      // Set cursor position after the variable
      setTimeout(() => {
        const newCursorPos = atSymbolIndex + variable.length + 2;
        element.setSelectionRange(newCursorPos, newCursorPos);
        element.focus();
      }, 0);
    }
  };

  // Function to highlight variables in text
  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{[^}]+\})/g);
    return parts.map((part, index) => {
      if (part.match(/^\{[^}]+\}$/)) {
        return (
          <span
            key={index}
            className="bg-gradient-to-r from-purple-400 to-blue-400 text-white px-1 rounded text-xs font-medium"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className="relative w-full">
      {/* Highlighted overlay for display */}
      {value && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none z-10 overflow-hidden text-black",
            className.replace("border", "border-transparent"),
          )}
          style={{
            whiteSpace: multiline ? "pre-wrap" : "pre",
            wordWrap: "break-word",
            padding: multiline ? "12px" : "8px 12px",
            fontSize: "14px",
            lineHeight: multiline ? "1.5" : "1.4",
          }}
        >
          {highlightVariables(value)}
        </div>
      )}

      {/* Actual input */}
      <InputComponent
        ref={ref as any}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full resize-none",
          className,
          "relative z-20 bg-transparent",
          multiline && "min-h-[120px]"
        )}
        rows={multiline ? 5 : undefined}
        style={{
          color: value ? "transparent" : "inherit",
          caretColor: "black",
          fontSize: "14px",
          lineHeight: multiline ? "1.5" : "1.4",
          padding: multiline ? "12px" : "8px 12px"
        }}
      />

      {showPopup && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-48 overflow-y-auto min-w-[200px]"
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
          }}
        >
          {filteredVariables.map((variable, index) => (
            <button
              key={variable}
              onClick={() => selectVariable(variable)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2 ${index === selectedIndex ? "bg-gray-100" : ""
                }`}
            >
              <div
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
                }}
              >
                {variable}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
